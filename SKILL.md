---
name: prior-knowledge-skill
description: "Prior knowledge space management. Index and accumulate research results so the agent can autonomously select and load relevant knowledge. Triggers: (1) 'research and save to knowledge base', 'look this up beforehand' (2) 'search the knowledge base', 'check prior knowledge' (3) when importing existing documents into the knowledge base"
---

# prior-knowledge-skill

## Important: Knowledge Granularity

The value of a knowledge base lies in **many small reference articles indexed together**, not one giant article.

```
❌ Bad: one massive article for "authentication"
✅ Good: decompose into multiple articles
   - oauth2-pkce-overview.md         ← PKCE basics
   - oauth2-token-storage.md         ← Token storage strategy comparison
   - session-vs-jwt.md               ← Session vs JWT
   - auth-middleware-compliance.md    ← Legal compliance requirements
```

When asked to research a large topic:
1. Decompose the topic into 3-7 small aspects
2. Run research.py for each aspect (1 aspect = 1 article)
3. Ensure the agent can selectively load only the articles it needs

Use 3 modes:

| Mode | Trigger | Action |
|------|---------|--------|
| **Research** | "research and save", "look this up" | research.py → index-manager.ts add |
| **Import** | importing existing docs into knowledge base | import-doc.ts (auto-updates INDEX) |
| **Reference** | before starting a task | read INDEX.md → load relevant articles only |

Storage: `docs/knowledge/articles/`, INDEX: `docs/knowledge/INDEX.md`

---

## Research → Save

Deep research a topic via Perplexity API (search-augmented LLM) and save to the knowledge base.
For query design, tagging, and quality criteria, see [references/research-guide.md](references/research-guide.md).

**Prerequisite**: research.py requires `OPENROUTER_API_KEY`. Check `~/.claude/skills/prior-knowledge-skill/.env` before running.

If not set, ask the user to configure the API key:

```bash
echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/.claude/skills/prior-knowledge-skill/.env
```

Import and reference modes work **without an API key**. Only research is restricted.

```bash
# 1. Run research (specify slug in English)
uv run ~/.claude/skills/prior-knowledge-skill/scripts/research.py \
  "specific query" \
  --output docs/knowledge/articles/<slug>.md \
  --tags "tag1,tag2"

# 2. Add to INDEX (use the path output to stdout)
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts add docs/knowledge/articles/<slug>.md
```

## Import Existing Documents

```bash
bun run ~/.claude/skills/prior-knowledge-skill/scripts/import-doc.ts <source.md> \
  [--title "Title"] \
  [--summary "One-line summary"] \
  [--tags "tag1,tag2"]
```

- Copies to `docs/knowledge/articles/` with frontmatter, auto-updates INDEX
- Original file is not modified (non-destructive)
- Write summaries specifically ([research-guide.md](references/research-guide.md))

## Knowledge Reference

INDEX.md functions as an intent INDEX database. Even after context compression, reading INDEX.md once gives a complete picture of the project's knowledge space, enabling autonomous selection of needed knowledge.

Before starting a task:

1. Read `docs/knowledge/INDEX.md` (title + summary table only, lightweight)
2. Identify article IDs relevant to the task
3. Read `docs/knowledge/articles/<id>.md` before starting work
   - If 0 relevant articles, proceed without loading (don't force it)
   - If many relevant articles, narrow to 1-3 most relevant

Keyword search is also available:

```bash
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts search "keyword"
```

---

## INDEX Management

```bash
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts add <article.md>
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts remove <id>
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts rebuild
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts search <keyword>
```

All default to `docs/knowledge/`. Override with `--index <path>` `--dir <path>`.

## Setup

```bash
cd ~/.claude/skills/prior-knowledge-skill && bun install
```
