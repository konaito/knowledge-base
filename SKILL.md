---
name: prior-knowledge-skill
description: >
  Prior knowledge space management. Index and accumulate research results so the agent can
  autonomously select and load relevant knowledge.
  Use when user asks to "research and save to knowledge base", "look this up beforehand",
  "search the knowledge base", "check prior knowledge", or when importing existing documents
  into the knowledge base.
---

# prior-knowledge-skill

## Important: Knowledge Granularity

The value of a knowledge base lies in **many small reference articles indexed together**, not one giant article.

When asked to research a large topic:
1. Decompose the topic into 3-7 small aspects
2. Run research.py for each aspect (1 aspect = 1 article)
3. Ensure the agent can selectively load only the articles it needs

## Instructions

### Step 1: Determine the mode

| Mode | Trigger | Summary |
|------|---------|---------|
| **Research** | "research and save", "look this up" | Research via Perplexity API → save article → add to INDEX |
| **Import** | Importing existing docs into knowledge base | Copy document → auto-update INDEX |
| **Reference** | Before starting a task | Read INDEX.md → load only relevant articles |

### Step 2: Execute by mode

**Research mode:**

CRITICAL: research.py requires `OPENROUTER_API_KEY`. If not set, ask the user to configure it.

```bash
# 1. Run research
uv run ~/.claude/skills/prior-knowledge-skill/scripts/research.py \
  "specific query" \
  --output docs/knowledge/articles/<slug>.md \
  --tags "tag1,tag2"

# 2. Add to INDEX
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts add docs/knowledge/articles/<slug>.md
```

For query design, tagging, and quality criteria, see `references/research-guide.md`.

**Import mode:**

```bash
bun run ~/.claude/skills/prior-knowledge-skill/scripts/import-doc.ts <source.md> \
  [--title "Title"] [--summary "One-line summary"] [--tags "tag1,tag2"]
```

Import and Reference modes work **without an API key**.

**Reference mode:**

1. Read `docs/knowledge/INDEX.md` (title + summary table only, lightweight)
2. Identify article IDs relevant to the task
3. Read `docs/knowledge/articles/<id>.md` before starting work
   - 0 relevant articles → proceed without loading (don't force it)
   - Many relevant articles → narrow to 1-3 most relevant

## Examples

### Example 1: Pre-research a new technology

User: "Research React Server Components and save to the knowledge base"

1. Decompose: data fetching, caching strategies, Server/Client boundary
2. Run research.py for each aspect (3 articles generated)
3. Add each article to INDEX via index-manager.ts
4. Report results to user

### Example 2: Import an existing document

User: "Add this API spec to the knowledge base"

1. Run import-doc.ts to copy to `docs/knowledge/articles/`
2. Assign title, summary, and tags (be specific with the summary)
3. INDEX is auto-updated

### Example 3: Reference knowledge before a task

User: "Implement the auth feature"

1. Read `docs/knowledge/INDEX.md`
2. Identify "oauth2-pkce-overview" and "session-vs-jwt" as relevant
3. Load those 2 articles before starting work

## Common Issues

### research.py fails with "API key not found"

Cause: `OPENROUTER_API_KEY` is not set.
Fix:
1. Check `~/.claude/skills/prior-knowledge-skill/.env`
2. If missing: `echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/.claude/skills/prior-knowledge-skill/.env`
3. Import/Reference modes work **without an API key**

### INDEX is out of sync with actual articles

Cause: Articles were manually added/deleted without updating the INDEX.
Fix:
```bash
bun run ~/.claude/skills/prior-knowledge-skill/scripts/index-manager.ts rebuild
```

### Articles not found during Reference mode

Cause: Summaries are too vague (e.g., "About React")
Fix: Rewrite summaries to be specific. See the Summary Design section in `references/research-guide.md`.

### bun install not run yet

Cause: First-time setup was not completed.
Fix:
```bash
cd ~/.claude/skills/prior-knowledge-skill && bun install
```

## References

- `references/research-guide.md` - Query design, tag design, summary design, quality criteria
- `references/commands.md` - Full command argument reference and setup instructions
- `assets/article-template.md` - Article frontmatter template
