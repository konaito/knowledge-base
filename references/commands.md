# Command Reference

## research.py - Run research

Researches a topic via the Perplexity API (search-augmented LLM) and saves as a Markdown article.

**Prerequisite**: Requires `OPENROUTER_API_KEY`.

```bash
# Set API key (first time only)
echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/.claude/skills/prior-knowledge-skill/.env
```

```bash
uv run ~/.claude/skills/prior-knowledge-skill/scripts/research.py \
  "specific query" \
  --output docs/knowledge/articles/<slug>.md \
  --tags "tag1,tag2"
```

- Queries should be specific (see `references/research-guide.md`)
- Slugs should be English kebab-case
- Use 3-6 tags

## index-manager.ts - INDEX management

```bash
# Add an article to the INDEX
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts add <article.md>

# Remove an article from the INDEX
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts remove <id>

# Rebuild INDEX from all articles
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts rebuild

# Keyword search
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts search <keyword>
```

Defaults to `docs/knowledge/`. Override with `--index <path>` `--dir <path>`.

## import-doc.ts - Import existing documents

```bash
bun run ~/.claude/skills/prior-knowledge-skill/scripts/import-doc.ts <source.md> \
  [--title "Title"] \
  [--summary "One-line summary"] \
  [--tags "tag1,tag2"]
```

- Copies to `docs/knowledge/articles/` with frontmatter
- INDEX is auto-updated
- Original file is not modified (non-destructive)

## Setup

```bash
cd ~/.claude/skills/prior-knowledge-skill && bun install
```
