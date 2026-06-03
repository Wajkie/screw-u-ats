# CodeScreen — Stop screening CVs. Screen code.

An open-source MCP server that evaluates candidates by what they've actually built. Give it a GitHub username and a role definition; it returns a fit score, concept breakdown, and hiring recommendation — based on real repos, real architecture decisions, and real shipped work.

> **Why "Screw U, ATS"?** ATS systems filter on keywords. A candidate who writes "React" gets through. A candidate with 12 React repos but no CV keyword doesn't. CodeScreen fixes that by reading the code instead.

> **Decision helper, not maker.** CodeScreen tells you what to ask about, what's proven, and what's missing — then gets out of the way. The interview is where the real signal is. The moment a tool makes the hiring decision for you, it becomes the thing it's trying to replace.

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

## Repo structure

This is a monorepo with four sub-projects under one root.

```
codescreen/
├── src/                        # MCP server + REST check endpoint
│   ├── server.ts               # MCP server entry point (stdio / HTTP+SSE)
│   ├── checkServer.ts          # Hono REST server (/check/:githubName)
│   ├── config.ts               # Env var loading
│   ├── toolRuntime.ts          # ToolRuntime / ToolDefinition contract
│   ├── github/
│   │   ├── fetchRepos.ts       # GitHub API — repo list + metadata
│   │   ├── fetchProfile.ts     # GitHub API — user profile
│   │   └── extractUrls.ts      # Pull live URLs from READMEs / package.json
│   ├── scoring/
│   │   ├── trajectoryScore.ts  # Complexity growth over time buckets
│   │   ├── conceptMatch.ts     # Role definition concept matcher
│   │   ├── complexitySignals.ts# Per-repo complexity heuristics
│   │   └── skillMap.ts         # Concept → language/dep mapping
│   ├── lighthouse/
│   │   └── runAudit.ts         # PageSpeed Insights + WCAG runner
│   └── tools/
│       ├── scoreCandidate.ts   # score_candidate tool
│       ├── scoreBatch.ts       # score_batch tool
│       ├── scoreAllRoles.ts    # score_all_roles tool
│       └── candidateProfile.ts # candidate_profile tool
│
├── screener-api/               # Hono REST API — candidates, openings, sourcing
│   └── src/
│       ├── index.ts            # Server entry point
│       ├── candidates/         # Candidate CRUD + scoring jobs
│       ├── openings/           # Job openings CRUD
│       ├── reports/            # Saved score reports
│       ├── roles/              # Role definitions endpoint
│       ├── sourcing/           # Outbound GitHub user search + runner
│       ├── jobs/               # Background job queue + runner
│       ├── github/             # GitHub user search helper
│       ├── db/                 # Kysely client, schema, migrations (libsql/Postgres)
│       └── middleware/         # Auth, CORS, rate limiting, body limit
│
├── screener-ui/                # React SPA — recruiter-facing web app
│   └── src/
│       ├── pages/              # Dashboard, CandidateDetail, Openings, Reports, Docs…
│       ├── components/         # Shared UI — Layout, Boundary, badges, charts
│       ├── hooks/              # Data-fetching hooks (React Query)
│       ├── api/                # Typed API client wrappers
│       └── styles/             # Global tokens + SCSS modules
│
├── docssite/                   # Vite + React docs site (legacy screener UI)
│   └── src/components/
│       └── Screener.tsx        # Visual screener + PDF export
│
├── knowledge/
│   ├── roles/                  # Role definition markdown files
│   │   ├── junior-frontend.md
│   │   ├── mid-frontend.md
│   │   └── ...                 # add more; server picks them up on restart
│   └── getting-started.md
├── docs/
│   └── docs.json               # Single source of truth for all docs content
├── scripts/
│   └── dev-screener.ps1        # Launches check server + docssite together
└── .env.example
```

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

**MCP server** (root):
```bash
npm run dev          # MCP server (tsx watch, stdio)
npm test             # Vitest unit tests
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run local        # check server + docssite + browser
```

**screener-api**:
```bash
cd screener-api
npm run dev          # Hono API server (tsx watch)
npm run typecheck
npm run lint
```

**screener-ui**:
```bash
cd screener-ui
npm run dev          # Vite dev server
npm run build        # copies screener-api/docs.json then tsc + vite build
npm run lint
```

**docssite** (legacy):
```bash
cd docssite && npm run dev   # Vite, port 5173
```

Built on [mcp-kit](./mcp-kit) — a production-ready MCP server scaffold with dual transport, write-gating, structured logging, and a docs-driven site generator.
