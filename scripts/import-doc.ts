#!/usr/bin/env bun

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { join, basename, resolve } from "path";
import { execSync } from "child_process";
import matter from "gray-matter";

const HOME = process.env.HOME || "~";
const PROJECT_ARTICLES = join(process.cwd(), "docs/knowledge/articles");
const PROJECT_INDEX = join(process.cwd(), "docs/knowledge/INDEX.md");
const INDEX_MANAGER = join(
  HOME,
  ".claude/skills/knowledge-base/scripts/index-manager.ts"
);

function slugify(text: string): string {
  // Keep Unicode word chars (CJK, etc) alongside ASCII
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const sourcePath = args[0];

  if (!sourcePath) {
    console.error(
      "Usage: import-doc.ts <source.md> [--title ...] [--summary ...] [--tags ...] [--scope global|project]"
    );
    process.exit(1);
  }

  const resolved = resolve(sourcePath);
  if (!existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const content = readFileSync(resolved, "utf-8");
  const parsed = matter(content);

  // Get metadata from flags or frontmatter
  const title =
    getFlag(args, "--title") ||
    parsed.data.title ||
    basename(resolved, ".md").replace(/-/g, " ");
  const summary =
    getFlag(args, "--summary") ||
    parsed.data.summary ||
    `${title}に関するドキュメント`;
  const tagsStr = getFlag(args, "--tags") || "";
  const tags = tagsStr
    ? tagsStr.split(",").map((t) => t.trim())
    : Array.isArray(parsed.data.tags)
      ? parsed.data.tags
      : [];
  const scope = getFlag(args, "--scope") || "project";

  const today = new Date().toISOString().split("T")[0];

  // Build new frontmatter
  const newData = {
    title,
    summary,
    tags,
    sources: parsed.data.sources || [],
    created: parsed.data.created || today,
    updated: today,
  };

  // Rebuild content with frontmatter
  const newContent = matter.stringify(parsed.content, newData);

  // Determine destination
  const slug = slugify(title);
  let destDir: string;
  let indexPath: string;

  destDir = PROJECT_ARTICLES;
  indexPath = PROJECT_INDEX;

  // Ensure dest dir exists
  execSync(`mkdir -p "${destDir}"`);

  const destPath = join(destDir, `${slug}.md`);
  writeFileSync(destPath, newContent, "utf-8");
  console.log(`Copied to: ${destPath}`);

  // Update index via index-manager
  try {
    execSync(
      `bun run "${INDEX_MANAGER}" add "${destPath}" --index "${indexPath}"`,
      { stdio: "inherit" }
    );
  } catch (e) {
    console.error("Failed to update index:", e);
    process.exit(1);
  }

  console.log(`Import complete: ${title} (${slug})`);
}

main();
