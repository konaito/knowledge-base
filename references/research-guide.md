# Research Guide — Query Design, Tagging, Quality Criteria

## Query Design

The output quality of research.py is determined by **query specificity**. Transform vague user requests into specific queries.

```
❌ Bad: "React"
❌ Bad: "about authentication"
✅ Good: "React Server Components data fetching patterns — comparing use(), Suspense, and caching strategies"
✅ Good: "OAuth 2.0 PKCE flow implementation — security considerations and token management for SPAs"
```

Rules:
- **Narrow the scope**: not "about X" but "Z aspect of Y within X"
- **State what you want to know**: include perspectives like "comparison", "implementation", "trade-offs", "pitfalls"
- **Provide context**: constraints like "for SPAs", "in large teams"

## Slug Design

Specify English-based short slugs via `--output`.

```
✅ react-server-components-data-fetching
✅ oauth2-pkce-spa-implementation
```

## Tag Design

Tags directly affect search accuracy. Apply 3-6 tags using these rules:

- **Technology names**: `react`, `typescript`, `supabase` (proper nouns, lowercase)
- **Concepts**: `architecture`, `security`, `performance` (abstract categories)
- **Domains**: `frontend`, `backend`, `devops` (application areas)

## Summary Design

Summaries appear in the INDEX and are the sole basis for relevance judgment. **Be specific**.

```
❌ Bad: "Document about React"
✅ Good: "React Server Components data fetching patterns. Comparison and implementation examples for use(), Suspense, and caching strategies"
```

## Quality Check

After saving, verify:
- Contains specific code examples or numbers
- Goes beyond surface-level explanation
- Sources are cited

If quality is insufficient, re-run with a different query or supplement the content manually.
