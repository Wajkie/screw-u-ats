# docs/docs.json — Schema Reference

`docs.json` is the single source of truth for the documentation site. Edit it to update every page — no React or TypeScript needed.

To preview changes: open a terminal, `cd docssite`, run `npm install` (first time), then `npm run dev`.

---

## Top-level structure

```json
{
  "meta": { ... },        ← site title, description, version, repo link
  "tools": [ ... ],       ← all MCP tools (referenced by ID in sections)
  "audiences": {
    "developer": { ... }, ← technical docs
    "business":  { ... }  ← non-technical stakeholder view
  }
}
```

---

## meta

```json
"meta": {
  "title":       "My MCP Server",
  "description": "One sentence shown under the title.",
  "version":     "0.1.0",
  "repo":        "https://github.com/your-org/your-repo"
}
```

---

## tools

Each tool is defined once here, then referenced by `id` in sections.

```json
{
  "id":            "my_tool",       ← unique key, matches the MCP tool name
  "name":          "my_tool",       ← displayed name
  "category":      "my-category",   ← groups tools visually
  "requiresWrites": false,          ← shows a "requires writes" badge
  "summary":       "One-liner.",
  "description":   "Longer explanation.",
  "inputs": [
    { "name": "param", "type": "string", "required": true, "description": "What it does" }
  ],
  "returns": {
    "description": "What comes back.",
    "shape": { "field": "type" }    ← can be any JSON shape
  },
  "example": {
    "input":  { "param": "value" },
    "output": { "field": "result" }
  }
}
```

---

## audiences / sections

Each audience has an array of `sections`. Each section has either `pages` (free-form content) or `groups` (tool references), or both.

```json
{
  "id":    "my-section",   ← used as the URL anchor (#my-section)
  "title": "My Section",
  "pages": [ ... ],        ← optional: free-form content pages
  "groups": [ ... ]        ← optional: tool reference groups
}
```

### groups (tool references)

```json
{
  "id":            "my-group",
  "title":         "My Tools",
  "requiresWrites": false,        ← optional badge on the group heading
  "toolRefs":      ["my_tool"]    ← array of tool IDs defined in "tools"
}
```

---

## Content blocks

Each page has a `content` array of blocks. Mix and match any block types:

### prose — a paragraph of text

```json
{ "type": "prose", "body": "Your paragraph text here." }
```

### code — a code snippet with copy button

```json
{ "type": "code", "lang": "bash", "label": "Optional label", "body": "npm install" }
```

`lang` is displayed as a badge (e.g. `bash`, `json`, `typescript`).

### callout — highlighted note

```json
{ "type": "callout", "variant": "info", "body": "Your note here." }
```

`variant` options: `info` (blue), `warning` (amber), `success` (green).

### list — bullet list

```json
{ "type": "list", "items": ["First item", "Second item"] }
```

### steps — numbered list

```json
{ "type": "steps", "items": ["Do this first", "Then do this"] }
```

### capability-list — label + summary pairs

```json
{
  "type": "capability-list",
  "items": [
    { "label": "Tool name", "summary": "What it does in one sentence." }
  ]
}
```

### env-table — environment variable table

```json
{
  "type": "env-table",
  "vars": [
    {
      "name":        "MY_VAR",
      "required":    false,
      "default":     "some-default",   ← use null if there is no default
      "description": "What it controls.",
      "example":     "example-value"   ← optional
    }
  ]
}
```

---

## Workflow for non-coders

1. Open `docs/docs.json` in any text editor.
2. Find the section you want to change (search for its `"title"` or `"id"`).
3. Edit the content — add, remove, or reorder blocks.
4. Save the file.
5. If the docssite dev server is running (`cd docssite && npm run dev`), the browser refreshes automatically.
6. To publish: run `cd docssite && npm run build`. The static files appear in `docssite/dist/`.
