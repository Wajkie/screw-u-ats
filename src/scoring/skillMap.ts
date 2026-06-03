import type { GitHubRepo } from "../github/fetchRepos.js";
import { hasDep, hasNugetDep } from "./complexitySignals.js";

export interface SkillMap {
  frontend: number;
  backend: number;
  devops: number;
  testing: number;
  architecture: number;
}

function scoreFrontendRepo(repo: GitHubRepo): number {
  const npm = repo.packageDeps;
  let pts = 0;

  const baseFrameworks = ["react", "vue", "angular", "svelte", "solid"];
  if (baseFrameworks.some((f) => hasDep(npm, f))) pts += 30;

  const metaFrameworks = ["next", "nuxt", "remix", "gatsby", "astro"];
  if (metaFrameworks.some((f) => hasDep(npm, f))) pts += 20;

  const cssFrameworks = ["tailwindcss", "styled-components", "emotion", "daisyui", "mantine", "chakra-ui"];
  if (cssFrameworks.some((f) => hasDep(npm, f))) pts += 15;

  if (repo.hasAppRouter) pts += 15;
  if (repo.hasHooksDir) pts += 10;

  const uiLibs = ["shadcn", "radix-ui", "headlessui"];
  if (uiLibs.some((f) => hasDep(npm, f))) pts += 10;

  return Math.min(pts, 100);
}

function scoreBackendRepo(repo: GitHubRepo): number {
  const npm = repo.packageDeps;
  const nuget = repo.csprojDeps;
  let pts = 0;

  const serverFrameworks = ["express", "fastify", "nestjs", "koa", "hono", "elysia"];
  if (serverFrameworks.some((f) => hasDep(npm, f))) pts += 30;

  const dotnetBackend = ["aspnetcore", "entityframework", "dapper", "signalr"];
  if (dotnetBackend.some((t) => hasNugetDep(nuget, t))) pts += 30;

  const ormDeps = ["prisma", "drizzle-orm", "kysely", "mongoose", "typeorm", "sequelize"];
  if (ormDeps.some((f) => hasDep(npm, f))) pts += 25;

  const authDeps = ["next-auth", "lucia", "better-auth", "iron-session"];
  if (authDeps.some((f) => hasDep(npm, f))) pts += 15;

  const apiLayerDeps = ["trpc", "graphql"];
  if (apiLayerDeps.some((f) => hasDep(npm, f))) pts += 15;

  const realtimeDeps = ["socket.io", "ws", "ably", "pusher-js"];
  if (realtimeDeps.some((f) => hasDep(npm, f))) pts += 15;

  return Math.min(pts, 100);
}

function scoreDevopsRepo(repo: GitHubRepo): number {
  let pts = 0;

  if (repo.hasCi) pts += 50;

  const deployDeps = ["vercel", "railway", "netlify", "wrangler", "fly"];
  if (deployDeps.some((f) => hasDep(repo.packageDeps, f))) pts += 25;

  const dockerSignal =
    repo.topics.some((t) => t.toLowerCase().includes("docker")) ||
    repo.readmeContent?.toLowerCase().includes("docker") === true;
  if (dockerSignal) pts += 25;

  return Math.min(pts, 100);
}

function scoreTestingRepo(repo: GitHubRepo): number {
  const npm = repo.packageDeps;
  const nuget = repo.csprojDeps;
  let pts = 0;

  if (repo.hasTests) pts += 40;

  const unitFrameworks = ["vitest", "jest", "mocha"];
  if (unitFrameworks.some((f) => hasDep(npm, f))) pts += 20;

  const dotnetTest = ["xunit", "nunit", "mstest", "fluentvalidation"];
  if (dotnetTest.some((t) => hasNugetDep(nuget, t))) pts += 20;

  const e2eDeps = ["cypress", "playwright"];
  if (e2eDeps.some((f) => hasDep(npm, f))) pts += 25;

  if (hasDep(npm, "@testing-library")) pts += 15;

  return Math.min(pts, 100);
}

function scoreArchitectureRepo(repo: GitHubRepo): number {
  const npm = repo.packageDeps;
  const nuget = repo.csprojDeps;
  let pts = 0;
  let dirSignals = 0;

  if (repo.hasLibDir) { pts += 20; dirSignals++; }
  if (repo.hasActionsDir) { pts += 20; dirSignals++; }
  if (repo.hasHooksDir) { pts += 15; dirSignals++; }
  if (repo.hasAppRouter) { pts += 15; dirSignals++; }

  if (dirSignals >= 3) pts += 15;
  else if (dirSignals >= 2) pts += 10;

  const patternDeps = ["inversify", "tsyringe", "mediatr", "automapper", "masstransit", "hangfire"];
  if (patternDeps.some((f) => hasDep(npm, f) || hasNugetDep(nuget, f))) pts += 15;

  return Math.min(pts, 100);
}

// Average the top N non-zero scores. Rewards consistency across repos — a single standout
// among many weak repos scores lower than a candidate who demonstrates the skill repeatedly.
// Zero-score repos are excluded so a mixed portfolio (frontend + backend repos) doesn't
// unfairly drag down a skill the candidate clearly has.
function topNMean(scores: number[], n: number): number {
  const nonZero = scores.filter((s) => s > 0);
  if (nonZero.length === 0) return 0;
  const top = [...nonZero].sort((a, b) => b - a).slice(0, n);
  return Math.round(top.reduce((sum, v) => sum + v, 0) / top.length);
}

export function computeSkillMap(repos: GitHubRepo[]): SkillMap {
  if (repos.length === 0) {
    return { frontend: 0, backend: 0, devops: 0, testing: 0, architecture: 0 };
  }

  return {
    frontend: topNMean(repos.map(scoreFrontendRepo), 3),
    backend: topNMean(repos.map(scoreBackendRepo), 3),
    devops: topNMean(repos.map(scoreDevopsRepo), 3),
    testing: topNMean(repos.map(scoreTestingRepo), 3),
    architecture: topNMean(repos.map(scoreArchitectureRepo), 3),
  };
}
