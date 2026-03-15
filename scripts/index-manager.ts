#!/usr/bin/env bun

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, basename, resolve } from "path";
import matter from "gray-matter";

const DEFAULT_INDEX = join(process.cwd(), "docs/knowledge/INDEX.md");
const DEFAULT_ARTICLES_DIR = join(process.cwd(), "docs/knowledge/articles");

// --- Helpers ---

interface Article {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  updated: string;
}

function parseIndex(indexPath: string): { header: string; rows: Article[] } {
  if (!existsSync(indexPath)) {
    return {
      header: `# Knowledge Base Index\n\n| id | title | summary | tags | updated |\n|----|-------|---------|------|---------|`,
      rows: [],
    };
  }
  const content = readFileSync(indexPath, "utf-8");
  const lines = content.split("\n");
  const rows: Article[] = [];

  for (const line of lines) {
    const match = line.match(
      /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/
    );
    if (match) {
      const [, id, title, summary, tags, updated] = match;
      // Skip header and separator rows
      if (id.trim() === "id" || id.trim().startsWith("-")) continue;
      rows.push({
        id: id.trim(),
        title: title.trim(),
        summary: summary.trim(),
        tags: tags
          .trim()
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        updated: updated.trim(),
      });
    }
  }

  return {
    header: `# Knowledge Base Index\n\n| id | title | summary | tags | updated |\n|----|-------|---------|------|---------|`,
    rows,
  };
}

function writeIndex(indexPath: string, header: string, rows: Article[]): void {
  const tableRows = rows
    .map(
      (r) =>
        `| ${r.id} | ${r.title} | ${r.summary} | ${r.tags.join(", ")} | ${r.updated} |`
    )
    .join("\n");
  const content = tableRows ? `${header}\n${tableRows}\n` : `${header}\n`;
  writeFileSync(indexPath, content, "utf-8");
}

function extractArticle(filePath: string): Article {
  const content = readFileSync(filePath, "utf-8");
  const { data } = matter(content);
  const id = basename(filePath, ".md");
  return {
    id,
    title: data.title || id,
    summary: data.summary || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    updated: data.updated || new Date().toISOString().split("T")[0],
  };
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

// --- Commands ---

function add(args: string[]): void {
  const articlePath = args[0];
  if (!articlePath) {
    console.error("Usage: index-manager.ts add <article.md> [--index <path>]");
    process.exit(1);
  }

  const resolved = resolve(articlePath);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const indexPath = getFlag(args, "--index") || DEFAULT_INDEX;
  const article = extractArticle(resolved);
  const { header, rows } = parseIndex(indexPath);

  // Remove existing entry with same id
  const filtered = rows.filter((r) => r.id !== article.id);
  filtered.push(article);

  // Sort by updated desc
  filtered.sort((a, b) => b.updated.localeCompare(a.updated));

  writeIndex(indexPath, header, filtered);
  console.log(`Added "${article.title}" (${article.id}) to index.`);
}

function remove(args: string[]): void {
  const id = args[0];
  if (!id) {
    console.error("Usage: index-manager.ts remove <id> [--index <path>]");
    process.exit(1);
  }

  const indexPath = getFlag(args, "--index") || DEFAULT_INDEX;
  const { header, rows } = parseIndex(indexPath);
  const filtered = rows.filter((r) => r.id !== id);

  if (filtered.length === rows.length) {
    console.error(`ID "${id}" not found in index.`);
    process.exit(1);
  }

  writeIndex(indexPath, header, filtered);
  console.log(`Removed "${id}" from index.`);
}

function rebuild(args: string[]): void {
  const dir = getFlag(args, "--dir") || DEFAULT_ARTICLES_DIR;
  const indexPath = getFlag(args, "--index") || DEFAULT_INDEX;

  if (!existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const rows: Article[] = files.map((f) => extractArticle(join(dir, f)));

  // Sort by updated desc
  rows.sort((a, b) => b.updated.localeCompare(a.updated));

  const header = `# Knowledge Base Index\n\n| id | title | summary | tags | updated |\n|----|-------|---------|------|---------|`;
  writeIndex(indexPath, header, rows);
  console.log(`Rebuilt index with ${rows.length} articles.`);
}

function search(args: string[]): void {
  const keyword = args[0]?.toLowerCase();
  if (!keyword) {
    console.error("Usage: index-manager.ts search <keyword> [--index <path>]");
    process.exit(1);
  }

  const indexPath = getFlag(args, "--index") || DEFAULT_INDEX;
  const { rows } = parseIndex(indexPath);

  const results = rows.filter(
    (r) =>
      r.title.toLowerCase().includes(keyword) ||
      r.summary.toLowerCase().includes(keyword) ||
      r.tags.some((t) => t.toLowerCase().includes(keyword)) ||
      r.id.toLowerCase().includes(keyword)
  );

  if (results.length === 0) {
    console.log(`No results for "${keyword}".`);
    return;
  }

  console.log(`Found ${results.length} result(s):\n`);
  for (const r of results) {
    console.log(`  ${r.id}: ${r.title}`);
    console.log(`    ${r.summary}`);
    console.log(`    tags: ${r.tags.join(", ")} | updated: ${r.updated}\n`);
  }
}

// --- Main ---

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "add":
    add(rest);
    break;
  case "remove":
    remove(rest);
    break;
  case "rebuild":
    rebuild(rest);
    break;
  case "search":
    search(rest);
    break;
  default:
    console.log(`Usage: index-manager.ts <command> [args]

Commands:
  add <article.md> [--index <path>]    Add article to index
  remove <id> [--index <path>]         Remove article from index
  rebuild [--dir <path>] [--index <path>]  Rebuild index from articles dir
  search <keyword> [--index <path>]    Search index by keyword

Defaults:
  --index  ${DEFAULT_INDEX}
  --dir    ${DEFAULT_ARTICLES_DIR}`);
    break;
}
