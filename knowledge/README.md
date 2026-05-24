# Knowledge Base

Drop markdown files here to give the MCP server domain context.

## How it works

- Every `.md` file is auto-registered as an MCP resource at `knowledge:///<slug>`.
- With `DATABASE_URL` set, all files are full-text indexed on startup via `pg_trgm` and
  searchable with the `search_knowledge` tool.
- Without a database, resources are still readable directly but `search_knowledge` returns
  an error explaining the requirement.

## Suggested file structure

| File | Purpose |
|------|---------|
| `getting-started.md` | Overview for new contributors |
| `architecture.md` | System design decisions |
| `conventions.md` | Coding standards and patterns |
| `examples.md` | Reference snippets |
| `runbook.md` | On-call procedures |

You can use any filenames. camelCase is converted to kebab-case for the URI
(e.g. `myTopic.md` → `knowledge:///my-topic`).

## Content tips

- Use `##` headings to create searchable sections — the search engine chunks by heading.
- Keep sections focused (one concept per heading).
- Concrete examples search better than abstract descriptions.
