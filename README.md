# CodeScreen — Stop screening CVs. Screen code.

An open-source MCP server that evaluates candidates by what they've actually built. Give it a GitHub username and a role definition; it returns a fit score, concept breakdown, and hiring recommendation — based on real repos, real architecture decisions, and real shipped work.

> **Why "Screw U, ATS"?** ATS systems filter on keywords. A candidate who writes "React" gets through. A candidate with 12 React repos but no CV keyword doesn't. CodeScreen fixes that by reading the code instead.

---

## How it works

CodeScreen fetches a candidate's public GitHub repos and scores them against a role definition markdown file on three signals:

| Signal | Weight | What it measures |
|---|---|---|
| **Trajectory** | 45% | Complexity growth over time — recent repos weighted 3×, learning velocity surfaced as its own signal |
| **Concept match** | 35% | Required and bonus concepts from the role definition, matched against languages, folder structure, and dependencies |
| **Complexity** | 20% | Project depth: tests, CI, routing, state management, README quality, commit span |

Minimum 50% fit score to recommend **Interview**. Ties between equal fit scores break on concept match — the only signal that's actually role-specific.

---

## Quick start

```bash
cp .env.example .env
# Set GITHUB_TOKEN (read:user, public_repo scopes)

npm install
npm run dev        # MCP server on stdio
```

To also expose the REST check endpoint and open the screener UI:

```bash
npm run local      # starts check server + docssite + opens browser
```

---

## MCP tools

| Tool | Description |
|---|---|
| `score_candidate` | Score one GitHub user against one role |
| `score_batch` | Score a list of usernames against a single role |
| `score_all_roles` | Score one user against every available role, grouped by track and tier |
| `candidate_profile` | Return a structured GitHub profile summary without scoring |
| `search_knowledge` | Full-text search across role definitions and knowledge files |

All tools are read-only (`sideEffect: "none"`). No writes, no GitHub mutations.

---

## REST endpoint

Set `CHECK_PORT` to enable a CORS-open Hono HTTP server:

```
GET /check/:githubName?graduation_date=YYYY-MM-DD&include_lighthouse=true
```

Returns the same `AllRolesResult` shape as `score_all_roles`. Used by the screener UI and safe to call from a browser.

Rate limited to 20 requests per IP per minute by default — configurable via `CHECK_RATE_LIMIT` and `CHECK_RATE_WINDOW_MS`.

---

## Screener UI

`npm run local` starts everything and opens the browser to a visual candidate screener:

- Enter a GitHub username → get all role scores grouped by track (Frontend / Fullstack / Backend / C#) with junior → mid → senior tier rows
- Trajectory curve shows complexity growth over time buckets
- Optional Lighthouse audit on live project URLs (requires `PAGESPEED_API_KEY`)
- **Copy prompt** exports a recruiter-ready AI prompt to clipboard
- **Download PDF** generates a structured PDF via jsPDF — no print dialog

---

## Role definitions

Plain markdown files in `knowledge/roles/`. Add one and the server picks it up on restart — no code changes needed.

```markdown
# Mid Frontend Engineer

## Required Concepts
- React with hooks
- TypeScript in React context
- REST API integration
- Git workflow

## Bonus Concepts
- Component testing
- Core Web Vitals
- Accessibility beyond basics

## Complexity Threshold
minimum_complexity_score: 50
```

Roles with no concepts defined are treated as stubs and skipped during scoring.

---

## Graduation date

Pass `?graduation_date=YYYY-MM-DD` (REST) or the `graduation_date` parameter (MCP) to down-weight repos created before that date. Pre-graduation work counts at 25% weight — useful for recent bootcamp grads where early school projects would otherwise drag down the trajectory score.

---

## Lighthouse enrichment

Opt-in per request via `include_lighthouse: true`. Extracts live URLs from READMEs and `package.json`, runs PageSpeed Insights audits, returns Performance / Accessibility / Best Practices / SEO scores plus WCAG violations. Zero effect on `fit_score` — shown as context only.

Requires `PAGESPEED_API_KEY` (Google PageSpeed Insights, free tier: 25k req/day).

---

## Environment variables

See `.env.example` for the full list with defaults and descriptions. Required:

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT — `read:user`, `public_repo` scopes |

Key optional variables:

| Variable | Default | Description |
|---|---|---|
| `CHECK_PORT` | — | Port for the Hono REST server; omit to disable |
| `PAGESPEED_API_KEY` | — | Enables Lighthouse enrichment |
| `PORT` | — | Port for HTTP+SSE MCP transport; omit for stdio only |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

---

## Development

```bash
npm run dev          # MCP server (tsx watch)
npm test             # Vitest unit tests
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint

cd docssite && npm run dev   # Docs/screener UI (Vite, port 5173)
```

Built on [mcp-kit](./mcp-kit) — a production-ready MCP server scaffold with dual transport, write-gating, structured logging, and a docs-driven site generator.
