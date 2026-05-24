# CodeScreen — Technical Plan

## What We're Building

An MCP server built on mcp-kit that evaluates junior developer candidates by analyzing their GitHub profile, scores their trajectory and concept fit against a role definition, and returns a structured hiring signal with optional Lighthouse enrichment.

---

## Repo Structure

```
codescreen/
  src/
    tools/
      scoreCandidate.ts       # Main tool
      auditUrls.ts            # Lighthouse/WCAG enrichment (separate, non-scoring)
    scoring/
      trajectoryScore.ts      # Growth direction algorithm
      conceptMatch.ts         # Role definition concept matcher
      complexitySignals.ts    # Repo complexity heuristics
    github/
      fetchProfile.ts         # GitHub API client
      fetchRepos.ts
      extractUrls.ts          # Pull live URLs from READMEs/package.json
    lighthouse/
      runAudit.ts             # Lighthouse + WCAG runner
    server.ts
    config.ts
  knowledge/
    roles/
      junior-frontend.md
      junior-fullstack.md
  docs/
    docs.json
```

---

## MCP Tool: `score_candidate`

```typescript
score_candidate(
  github_username: string,
  role: "junior-frontend" | "junior-fullstack",
  include_lighthouse?: boolean  // default false
)
```

Returns:
```json
{
  "candidate": "username",
  "role": "junior-frontend",
  "fit_score": 72,
  "recommendation": "Interview",
  "breakdown": {
    "trajectory": 81,
    "concept_match": 68,
    "complexity": 65
  },
  "matched_concepts": ["React", "component composition", "REST consumption"],
  "missing_concepts": ["testing", "accessibility basics"],
  "trajectory_summary": "Complexity increasing over last 6 months. Moved from todo apps to multi-page apps with routing.",
  "enrichment": {
    "lighthouse": { ... },
    "live_projects_found": 2
  }
}
```

---

## Scoring Model (juniors only)

Three signals, combined into `fit_score`:

| Signal | Weight | What it measures |
|---|---|---|
| **Trajectory** | 45% | Complexity growth over time, learning velocity |
| **Concept Match** | 35% | Concepts from role definition present in repos |
| **Complexity** | 20% | Project depth (not just "has React", but how it's used) |

Minimum threshold to recommend: **50% fit score**

### Trajectory Algorithm
- Split repos into time buckets: 0–3 months, 3–6 months, 6–12 months, 12m+
- Score each bucket's average complexity
- Calculate delta — positive = learning velocity signal
- Recent repos weighted 3x vs repos older than 12 months

### Concept Match
- Role definition markdown lists required + bonus concepts
- GitHub data sources: languages, README content, folder structure, dependency names in package.json
- Required concepts hit → base score; bonus concepts → multiplier

### Complexity Signals (per repo)
- Multiple files vs single file
- Has tests (any `*.test.*`, `*.spec.*`, `__tests__/`)
- Has CI config (`.github/workflows/`, etc.)
- Dependency count and maturity (e.g. uses a router, state management)
- README quality (length, has screenshots/demo link)
- Commit frequency and span

---

## Role Definitions

Plain markdown, structured for machine parsing:

```markdown
# Junior Frontend Engineer

## Required Concepts
- HTML/CSS fundamentals
- JavaScript (ES6+)
- React or Vue or Svelte
- REST API consumption
- Version control (Git)

## Bonus Concepts
- TypeScript
- Component testing
- Responsive design
- Deployment (Vercel, Netlify, etc.)

## Complexity Threshold
minimum_complexity_score: 40
```

---

## Lighthouse Enrichment (non-scoring)

- `extractUrls.ts` pulls URLs from READMEs and package.json `homepage` field
- Runs Lighthouse programmatically against each live URL
- Returns scores for: Performance, Accessibility, Best Practices, SEO
- Flags WCAG AA violations if any
- Shown in output as context, **zero effect on fit_score**

---

## Build Order

1. GitHub API client + repo fetcher
2. Complexity signals per repo
3. Concept matcher against role definitions
4. Trajectory algorithm
5. `score_candidate` tool wired into mcp-kit `ToolRuntime`
6. Junior role definitions (`junior-frontend.md`, `junior-fullstack.md`)
7. Lighthouse enrichment as opt-in
8. Docs site JSON
