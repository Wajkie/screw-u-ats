import type { GitHubRepo } from "../github/fetchRepos.js";

// Heuristic weights — must sum to 100.
// These feed the Complexity signal (20% of fit_score) and the Trajectory algorithm.
// Do not change without updating the scoring spec in PLAN.md.
const W = {
  SIZE: 15,      // Repo size (KB) as proxy for multi-file substance
  HAS_TESTS: 25, // Presence of test files or test directory
  HAS_CI: 15,    // Presence of CI config (.github/workflows, etc.)
  DEPS: 25,      // Framework/library maturity inferred from README + topics + description
  README: 15,    // README quality: length and media/demo presence
  SPAN: 5,       // Activity span: days between repo creation and last push
} as const;

// Base frameworks — signals the candidate uses a modern stack rather than vanilla only.
// 5 pts for first hit, max W.DEPS × 0.20 = 5 pts total from this tier.
const TIER1_FRAMEWORKS = ["react", "vue", "angular", "svelte", "solid-js", "solid"];

// Ecosystem libraries — routing, state management, meta-frameworks, backend, ORMs, API layers.
// 2 pts each, max W.DEPS × 0.60 = 15 pts total from this tier.
const TIER2_ECOSYSTEM = [
  "next", "nuxt", "remix", "gatsby", "astro",
  "express", "fastify", "nestjs", "koa", "hono",
  "react-router", "vue-router", "wouter",
  "redux", "zustand", "mobx", "pinia", "recoil", "jotai", "valtio",
  "prisma", "mongoose", "typeorm", "sequelize", "drizzle",
  "graphql", "apollo", "trpc",
  "vite", "webpack", "turbopack",
];

// Quality markers — TypeScript, test frameworks, UI tooling.
// 2 pts each, max W.DEPS × 0.20 = 5 pts total from this tier.
const TIER3_QUALITY = [
  "typescript",
  "vitest", "jest", "cypress", "playwright", "testing-library",
  "storybook",
  "tailwind", "styled-components",
];

export interface ComplexityBreakdown {
  size: number;     // 0–15
  hasTests: number; // 0–25
  hasCi: number;    // 0–15
  deps: number;     // 0–25
  readme: number;   // 0–15
  span: number;     // 0–5
  total: number;    // 0–100
}

function scoreDeps(repo: GitHubRepo): number {
  const haystack = [
    repo.readmeContent ?? "",
    repo.description ?? "",
    repo.topics.join(" "),
    repo.language ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const t1Hits = TIER1_FRAMEWORKS.filter((dep) => haystack.includes(dep)).length;
  const t1 = Math.min(t1Hits * 5, 5);

  const t2Hits = TIER2_ECOSYSTEM.filter((dep) => haystack.includes(dep)).length;
  const t2 = Math.min(t2Hits * 2, 15);

  const t3Hits = TIER3_QUALITY.filter((dep) => haystack.includes(dep)).length;
  const t3 = Math.min(t3Hits * 2, 5);

  return t1 + t2 + t3; // max 25
}

function scoreSize(repo: GitHubRepo): number {
  // repo.size is in KB (GitHub API convention).
  // Thresholds distinguish trivial scripts from real multi-file projects.
  const kb = repo.size;
  if (kb >= 500) return 15;
  if (kb >= 50) return 10;
  if (kb >= 5) return 5;
  return 0;
}

function scoreReadme(repo: GitHubRepo): number {
  const content = repo.readmeContent;
  if (!content) return 0;

  // Length: 0–10 pts. Longer READMEs signal intentional documentation effort.
  let lengthPts: number;
  if (content.length >= 1000) lengthPts = 10;
  else if (content.length >= 300) lengthPts = 8;
  else if (content.length >= 100) lengthPts = 4;
  else lengthPts = 1;

  // Media/demo presence: 0–5 pts.
  const hasImage = /!\[.*?\]\(/.test(content);
  const hasDemoLink =
    /\b(demo|live|deploy|preview|vercel\.app|netlify\.app|github\.io|herokuapp)\b/i.test(content);
  const mediaPts = (hasImage ? 3 : 0) + (hasDemoLink ? 2 : 0);

  return Math.min(lengthPts + mediaPts, W.README);
}

function scoreSpan(repo: GitHubRepo): number {
  const spanDays =
    (new Date(repo.pushedAt).getTime() - new Date(repo.createdAt).getTime()) /
    86_400_000;

  // Longer active development period → project grew over time rather than created once and forgotten.
  if (spanDays >= 90) return 5;
  if (spanDays >= 30) return 3;
  if (spanDays >= 7) return 1;
  return 0;
}

export function scoreComplexityDetailed(repo: GitHubRepo): ComplexityBreakdown {
  const size = scoreSize(repo);
  const hasTests = repo.hasTests ? W.HAS_TESTS : 0;
  const hasCi = repo.hasCi ? W.HAS_CI : 0;
  const deps = scoreDeps(repo);
  const readme = scoreReadme(repo);
  const span = scoreSpan(repo);

  return {
    size,
    hasTests,
    hasCi,
    deps,
    readme,
    span,
    total: size + hasTests + hasCi + deps + readme + span,
  };
}

export function scoreComplexity(repo: GitHubRepo): number {
  return scoreComplexityDetailed(repo).total;
}
