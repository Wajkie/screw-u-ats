import type { GitHubRepo } from "../github/fetchRepos.js";

// Heuristic weights — must sum to 100.
// These feed the Complexity signal (20% of fit_score) and the Trajectory algorithm.
// Do not change without updating the scoring spec in PLAN.md.
const W = {
  SIZE: 15,         // Repo size (KB) as proxy for multi-file substance
  HAS_TESTS: 25,    // Presence of test files or test directory
  HAS_CI: 15,       // Presence of CI config (.github/workflows, etc.)
  DEPS: 20,         // Framework/library depth from actual package.json deps
  ARCHITECTURE: 10, // Folder structure signals (App Router, hooks/, lib/, actions/)
  README: 10,       // README quality: length and media/demo presence
  SPAN: 5,          // Activity span: days between repo creation and last push
} as const;

// T1: Base frameworks — 5 pts for first hit, max 5.
const TIER1_FRAMEWORKS = ["react", "vue", "angular", "svelte", "solid-js", "solid"];

// T2: Ecosystem libs — 2 pts each, max 10.
const TIER2_ECOSYSTEM = [
  // Meta-frameworks
  "next", "nuxt", "remix", "gatsby", "astro",
  // Backend
  "express", "fastify", "nestjs", "koa", "hono", "elysia",
  // Routing
  "react-router", "vue-router", "wouter", "@tanstack/react-router",
  // State
  "redux", "zustand", "mobx", "pinia", "recoil", "jotai", "valtio", "nanostores",
  // Data fetching
  "@tanstack/react-query", "swr", "apollo-client",
  // ORMs / DB
  "prisma", "drizzle-orm", "kysely", "mongoose", "typeorm", "sequelize",
  // Auth
  "next-auth", "lucia", "better-auth", "iron-session",
  // API layers
  "trpc", "graphql",
  // Realtime
  "socket.io", "ws", "ably", "pusher-js",
  // Build
  "vite", "webpack", "turbopack",
  // .NET frameworks (matched via NuGet substring or README/topics)
  "aspnetcore", "entityframework", "dapper", "signalr", "blazor", "maui",
];

// T3: Quality markers — 2 pts each, max 4.
const TIER3_QUALITY = [
  // JS
  "typescript",
  "vitest", "jest", "cypress", "playwright", "@testing-library",
  "storybook",
  "tailwindcss", "tailwind", "styled-components", "emotion",
  // .NET testing & validation
  "xunit", "nunit", "mstest", "fluentvalidation",
];

// Modern ecosystem — 1 pt each, max 1 (additional on top of T3).
const TIER4_MODERN = [
  // JS forms & validation
  "zod", "react-hook-form", "valibot", "yup",
  // JS UI
  "shadcn", "radix-ui", "@radix-ui", "headlessui", "daisyui", "mantine", "chakra-ui", "framer-motion", "motion",
  // JS 3D / Canvas
  "three", "@react-three", "r3f", "konva",
  // JS animation
  "gsap", "lottie", "anime",
  // JS tables & data
  "@tanstack/react-table", "ag-grid",
  // JS i18n
  "next-intl", "react-i18next", "i18next",
  // JS date
  "date-fns", "dayjs", "luxon",
  // JS utility
  "lodash", "ramda", "immer",
  // JS security
  "bcryptjs", "bcrypt", "otplib", "speakeasy",
  // JS infra
  "@vercel/og", "sharp", "resend", "nodemailer",
  // .NET modern
  "mediatr", "automapper", "serilog", "polly", "masstransit", "hangfire", "hotchocolate",
];

export interface ComplexityBreakdown {
  size: number;         // 0–15
  hasTests: number;     // 0–25
  hasCi: number;        // 0–15
  deps: number;         // 0–20
  architecture: number; // 0–10
  readme: number;       // 0–10
  span: number;         // 0–5
  total: number;        // 0–100
}

export function hasDep(packageDeps: string[], term: string): boolean {
  const t = term.toLowerCase();
  return packageDeps.some((d) => {
    const dep = d.toLowerCase();
    // For scoped packages (@scope/name): check both the scope org and the package name.
    // e.g. "@prisma/client" → scopeOrg="prisma", pkgName="client"
    const scopeOrg = dep.startsWith("@") ? dep.slice(1).split("/")[0]! : "";
    const pkgName = dep.includes("/") ? dep.split("/").pop()! : dep;
    return (
      dep === t ||
      pkgName === t ||
      scopeOrg === t ||
      dep.endsWith(`/${t}`) ||
      dep.startsWith(`${t}/`) ||
      dep === `${t}js` ||
      pkgName === `${t}js`
    );
  });
}

// NuGet packages use dotted names (Microsoft.AspNetCore.OpenApi) — substring match on lowercased name.
export function hasNugetDep(csprojDeps: string[], term: string): boolean {
  const t = term.toLowerCase();
  return csprojDeps.some((d) => d.toLowerCase().includes(t));
}

function scoreDeps(repo: GitHubRepo): number {
  const npmDeps = repo.packageDeps;
  const nugetDeps = repo.csprojDeps;
  const hasDepsData = npmDeps.length > 0 || nugetDeps.length > 0;

  // When any dep manifest is available use it; otherwise fall back to text matching.
  const textHaystack = hasDepsData
    ? ""
    : [repo.readmeContent ?? "", repo.description ?? "", repo.topics.join(" "), repo.language ?? ""]
        .join(" ")
        .toLowerCase();

  function detected(term: string): boolean {
    if (!hasDepsData) return textHaystack.includes(term);
    return hasDep(npmDeps, term) || hasNugetDep(nugetDeps, term);
  }

  const t1Hits = TIER1_FRAMEWORKS.filter(detected).length;
  const t1 = Math.min(t1Hits * 5, 5);

  const t2Hits = TIER2_ECOSYSTEM.filter(detected).length;
  const t2 = Math.min(t2Hits * 2, 10);

  const t3Hits = TIER3_QUALITY.filter(detected).length;
  const t3 = Math.min(t3Hits * 2, 4);

  const t4Hits = TIER4_MODERN.filter(detected).length;
  const t4 = Math.min(t4Hits * 1, 1);

  return t1 + t2 + t3 + t4; // max 20
}

function scoreArchitecture(repo: GitHubRepo): number {
  let pts = 0;
  if (repo.hasAppRouter) pts += 4;   // Next.js App Router — intentional routing architecture
  if (repo.hasLibDir) pts += 2;      // lib/ — service/utility separation
  if (repo.hasHooksDir) pts += 2;    // hooks/ — custom hook abstraction layer
  if (repo.hasActionsDir) pts += 2;  // actions/ — server actions or service layer
  return Math.min(pts, W.ARCHITECTURE);
}

function scoreSize(repo: GitHubRepo): number {
  const kb = repo.size;
  if (kb >= 500) return 15;
  if (kb >= 50) return 10;
  if (kb >= 5) return 5;
  return 0;
}

function scoreReadme(repo: GitHubRepo): number {
  const content = repo.readmeContent;
  if (!content) return 0;

  let lengthPts: number;
  if (content.length >= 1000) lengthPts = 7;
  else if (content.length >= 300) lengthPts = 5;
  else if (content.length >= 100) lengthPts = 2;
  else lengthPts = 0;

  const hasImage = /!\[.*?\]\(/.test(content);
  const hasDemoLink =
    /\b(demo|live|deploy|preview|vercel\.app|netlify\.app|github\.io|herokuapp)\b/i.test(content);
  const mediaPts = (hasImage ? 2 : 0) + (hasDemoLink ? 1 : 0);

  return Math.min(lengthPts + mediaPts, W.README);
}

function scoreSpan(repo: GitHubRepo): number {
  const spanDays =
    (new Date(repo.pushedAt).getTime() - new Date(repo.createdAt).getTime()) /
    86_400_000;

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
  const architecture = scoreArchitecture(repo);
  const readme = scoreReadme(repo);
  const span = scoreSpan(repo);
  const total = Math.min(size + hasTests + hasCi + deps + architecture + readme + span, 100);

  return { size, hasTests, hasCi, deps, architecture, readme, span, total };
}

export function scoreComplexity(repo: GitHubRepo): number {
  return scoreComplexityDetailed(repo).total;
}
