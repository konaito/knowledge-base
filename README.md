# prior-knowledge-skill

**Prior knowledge space for AI agents** — Claude Code Skill

## Why This Skill Exists

### The Origin: Limits of `/docs` Knowledge Accumulation

When working with AI agents over long sessions, you start accumulating research results and technical insights as Markdown files in a `docs/` directory. Even after context compression, knowledge persisted on the filesystem can be re-read and reused.

But this approach has a fundamental problem: **what's accumulated in `docs/` is not explicit to the agent**. After context compression, an agent trying to find relevant knowledge from 30 Markdown files in `docs/` has to list files, guess from filenames, and possibly read each one. There's no way to grasp the full scope of accumulated knowledge, so relevant knowledge sits unused.

### The INDEX Pattern: A Knowledge Space That Survives Context Compression

This skill introduces `INDEX.md` to enable **instant reconstruction of the entire knowledge map** even after context compression:

```
┌──────────────────────────────────────────┐
│  Context Window                          │
│                                          │
│  ┌───────────────────────┐               │
│  │ INDEX.md (~few hundred│ ← always loaded│
│  │  tokens)              │               │
│  │ title | summary | tags│               │
│  └───────────────────────┘               │
│           │                              │
│           │ selectively load relevant    │
│           ▼ articles only                │
│  ┌───────────────────────┐               │
│  │ article-a.md          │ ← on demand   │
│  └───────────────────────┘               │
│                                          │
│  remaining context → available for work  │
└──────────────────────────────────────────┘
```

INDEX.md serves two roles:

1. **Context efficiency**: A lightweight table (title + one-line summary) keeps context overhead minimal even with dozens of articles. The agent reads only the INDEX to decide "is there relevant knowledge for this task?" and loads only the needed articles.

2. **Intent INDEX database**: Even after context compression, reading INDEX.md once gives the agent a complete picture of the project's knowledge space. A persistent table of contents that lets the agent autonomously judge "what do I know, and what don't I know" — guaranteeing **knowledge discoverability** that simply dumping files into `docs/` could never achieve.

## Design Philosophy

### 1. Knowledge Granularity — A Collection of Small References

The essence of a knowledge base is **not one giant research dump**, but **many small reference articles indexed together**.

```
❌ Don't do this:
INDEX.md
└── authentication.md  (5000-line mega article)

✅ Do this:
INDEX.md
├── oauth2-pkce-overview.md         ← PKCE basics
├── oauth2-token-storage.md         ← Token storage strategy comparison
├── session-vs-jwt.md               ← Session vs JWT
├── auth-middleware-compliance.md    ← Legal compliance requirements
└── nextauth-v5-migration.md        ← NextAuth v5 migration notes
```

When an agent is unsure about token storage, it loads just `oauth2-token-storage.md` instead of a 5000-line monolith. This is the real power of the INDEX pattern.

For large topics, decompose into 3-7 focused aspects first, then save each as an independent article.

### 2. Project-Local — Why Not Global

Knowledge is stored per-project in `docs/knowledge/`. No global knowledge store.

Why: There's no value in storing generic knowledge that the LLM already has (React basics, how HTTP works, etc.). What's worth storing is **project-specific research** — domain knowledge, architecture decision context, specific library pitfalls — insights not in the LLM's training data.

Project-local means it's git-managed, team-shareable, and disappears with the project.

### 3. Async Research

Research uses the Perplexity API (via OpenRouter). Instead of the agent running research itself, it delegates to a search-specialized LLM — an async model.

```
Agent                          Perplexity API
  │                                │
  │  Design query (be specific)    │
  │───────────────────────────────▶│
  │                                │ Multi-language search
  │                                │ Information synthesis
  │  Frontmatter-equipped Markdown │
  │◀───────────────────────────────│
  │                                │
  │  Update INDEX                  │
  │  Quality check                 │
  ▼
```

Research quality is determined by query specificity. Not "React" but "React Server Components data fetching patterns — comparing use() vs Suspense with caching strategies."

### 4. Progressive Disclosure

The skill itself uses Progressive Disclosure:

- **SKILL.md** (~100 lines) — core workflow and script usage only
- **references/research-guide.md** — query design, tagging, quality criteria (loaded only when needed)
- **assets/article-template.md** — article frontmatter template

## Features

### Research → Save

Deep research a topic via Perplexity API, saving as frontmatter-equipped Markdown.

```bash
# Run research
uv run scripts/research.py \
  "OAuth 2.0 PKCE flow implementation — security considerations for SPAs" \
  --output docs/knowledge/articles/oauth2-pkce-spa.md \
  --tags "oauth,security,spa"

# Add to INDEX
bun run scripts/index-manager.ts add docs/knowledge/articles/oauth2-pkce-spa.md
```

Generated article structure:

```markdown
---
title: "OAuth 2.0 PKCE flow implementation..."
summary: "..."
tags: ["oauth", "security", "spa"]
sources: ["https://...", "https://..."]
created: 2026-03-15
updated: 2026-03-15
---

## Overview
...
## Core Concepts
...
## Practical Insights
...
## Comparisons & Trade-offs
...
## Pitfalls
...
## Sources
1. https://...
```

### Import Existing Documents

Import existing Markdown from your project into the knowledge base. Automatically adds frontmatter and updates the INDEX. Original files are not modified.

```bash
bun run scripts/import-doc.ts docs/architecture-decision.md \
  --title "Auth Architecture Decision" \
  --summary "Session vs JWT comparison, PKCE adoption rationale, token storage strategy" \
  --tags "auth,architecture,decision"
```

### INDEX Management

```bash
# Add article to INDEX
bun run scripts/index-manager.ts add <article.md>

# Remove from INDEX
bun run scripts/index-manager.ts remove <id>

# Rebuild entire INDEX from articles directory
bun run scripts/index-manager.ts rebuild

# Keyword search
bun run scripts/index-manager.ts search <keyword>
```

INDEX.md contents:

```markdown
# Knowledge Base Index

| id | title | summary | tags | updated |
|----|-------|---------|------|---------|
| oauth2-pkce-spa | OAuth 2.0 PKCE... | PKCE flow for SPAs... | oauth, security, spa | 2026-03-15 |
| auth-architecture | Auth Architecture... | Session vs JWT comparison... | auth, architecture | 2026-03-15 |
```

## Setup

### 1. Install the Skill

```bash
# npx skills (recommended)
npx skills add konaito/prior-knowledge-skill

# Or manual clone
cd ~/.claude/skills
git clone https://github.com/konaito/prior-knowledge-skill.git
cd prior-knowledge-skill && bun install
```

### 2. Set API Key (for research features)

```bash
echo 'OPENROUTER_API_KEY=sk-or-...' > ~/.claude/skills/prior-knowledge-skill/.env
```

Get an API key from [OpenRouter](https://openrouter.ai). Uses the Perplexity sonar-pro model.

Import and reference modes work **without an API key**. Only research requires it.

### 3. Add Reference Instruction to CLAUDE.md (Recommended)

Add the following to your project or global CLAUDE.md so the agent automatically checks for prior knowledge before starting tasks:

```markdown
# Prior Knowledge Space

Before working on a task, check for relevant prior knowledge:
1. If `docs/knowledge/INDEX.md` exists, read it and identify relevant knowledge
2. If relevant articles exist, read `docs/knowledge/articles/<id>.md` before starting the task
```

## File Structure

```
prior-knowledge-skill/
├── SKILL.md                          # Skill definition (agent instructions)
├── scripts/
│   ├── index-manager.ts              # INDEX.md CRUD operations
│   ├── research.py                   # Deep research via Perplexity API
│   └── import-doc.ts                 # Import existing Markdown
├── references/
│   └── research-guide.md             # Query design, tagging, quality guide
├── assets/
│   └── article-template.md           # Article frontmatter template
└── package.json                      # bun dependencies (gray-matter)
```

Generated in your project:

```
<project>/
└── docs/knowledge/
    ├── INDEX.md                      # Title + summary table
    └── articles/
        ├── oauth2-pkce-spa.md
        └── auth-architecture.md
```

## Requirements

- [bun](https://bun.sh) — TypeScript script execution
- [uv](https://docs.astral.sh/uv/) — Python script execution (research.py only)
- [OpenRouter API Key](https://openrouter.ai) — Research feature only

## License

MIT
