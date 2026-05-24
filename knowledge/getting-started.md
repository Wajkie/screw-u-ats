# Getting Started

This is an example knowledge base file. Replace its contents with your project's documentation.

## What is the knowledge base?

The `knowledge/` directory holds markdown files that MCP clients can read as resources and search
via the `search_knowledge` tool. Use it to give the AI context about your project: conventions,
architecture, runbooks, examples, and anything else it needs to do its job well.

## How resources are exposed

Every `.md` file in this directory is automatically registered as an MCP resource with:

- **URI**: `knowledge:///<slug>` (the filename without `.md`, camelCase converted to kebab-case)
- **Name**: `knowledge-<slug>`
- **MIME type**: `text/markdown`

An AI client can read any resource directly by URI, or search across all of them with the
`search_knowledge` tool (requires `DATABASE_URL` with a Postgres database).

## Adding new files

1. Create a new `.md` file in `knowledge/` (e.g. `myTopic.md`).
2. Restart the server — it picks up the file automatically.
3. If `DATABASE_URL` is set, the file is indexed on startup and becomes searchable.

No code changes needed.
