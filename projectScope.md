CodeScreen — Concept Summary

  ▎ Stop screening CVs. Screen code.

  ---
  The Problem

  ATS systems screen words. A candidate writes "React" on their CV and gets through. A candidate who never thought to write "React" but has 12 React repos gets filtered out. The entire industry is optimizing for keyword
   matching instead of demonstrated ability — and everyone knows it, tolerates it, and hires badly because of it.

  ---
  The Idea

  An open source MCP server that evaluates candidates by what they've actually built. Give it a GitHub username and a role definition. It comes back with a fit score, a breakdown of matched concepts, and a hiring
  recommendation — based on real code, real architecture decisions, and real shipped products.

  ---
  How It Works

  1. GitHub Analysis
  Fetches the candidate's public repos, READMEs, languages, and commit activity. Looks for architecture patterns, not just languages — a candidate using an event-driven service pattern in a side project tells you more
  than "TypeScript: yes" on a CV.

  2. Deployed URL Auditing
  Extracts live URLs from READMEs and package.json. Runs Lighthouse and WCAG audits automatically. Scores performance, accessibility, and best practices against role-specific thresholds. A frontend role at an e-commerce
   company might require Lighthouse performance ≥ 85 and WCAG AA — enforced automatically.

  3. Role Definitions as Markdown
  knowledge/
  ├── roles/
  │   ├── frontend-engineer.md
  │   ├── fullstack-engineer.md
  │   └── devtools-engineer.md
  Human-readable, community-contributed, version-controlled. A company opens a PR with their specific stack. The community maintains common roles. No black box — anyone can read exactly what's being evaluated and why.

  4. Fit Scoring
  Minimum 50% concept match to be flagged as a potential hire. The score isn't just language presence — it weights project complexity, architectural maturity, test coverage signals, README quality, and deployment
  polish. A todo app in React scores lower than a published component library in React.

  5. MCP Interface
  Plugs into any AI agent workflow. A recruiter's AI assistant can call score_candidate(username, role) mid-conversation. No separate dashboard required, no new tool to learn — it works inside whatever the recruiter
  already uses.

  ---
  What Makes It Different

  ┌─────────────────────────┬────────────────────────────────────┐
  │       ATS Systems       │             CodeScreen             │
  ├─────────────────────────┼────────────────────────────────────┤
  │ Screens CVs             │ Screens code                       │
  ├─────────────────────────┼────────────────────────────────────┤
  │ Keyword matching        │ Concept matching                   │
  ├─────────────────────────┼────────────────────────────────────┤
  │ Black box scoring       │ Open, readable role definitions    │
  ├─────────────────────────┼────────────────────────────────────┤
  │ Misses great candidates │ Finds people who can't self-market │
  ├─────────────────────────┼────────────────────────────────────┤
  │ Closed enterprise SaaS  │ Open source, community-contributed │
  └─────────────────────────┴────────────────────────────────────┘

  ---
  My Addition — Candidate Trajectory Scoring

  One thing none of the existing tools do: measure growth direction, not just current state.

  A candidate with 3 repos from 2 years ago that are todo apps, and 3 repos from the last 6 months showing MCP servers and AST tooling, is a very different hire than someone with 6 consistent but shallow repos. The
  trajectory tells you where they'll be in 12 months, not just where they are today.

  CodeScreen would score the delta — recent repos weighted higher, complexity progression tracked, learning velocity surfaced as its own signal. A fast learner at 70% fit today beats a stagnant candidate at 85% fit.

  ---
  The Open Source Play

  Role definitions are community-contributed — better definitions benefit every company using the tool. Developers star it because the repo is called screw-u-ats. Recruiters use it because it's called CodeScreen and it
  works. The transparency of open source solves the trust problem that makes candidates and companies both skeptical of AI screening.

  ---
  Built with: mcp-kit · Lighthouse API · GitHub API · knowledge/*.md role definitions
  Repo: github.com/Wajkie/screw-u-ats
  Product: CodeScreen