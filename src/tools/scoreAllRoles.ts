import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchRepos } from "../github/fetchRepos.js";
import { scoreComplexity, filterNoise } from "../scoring/complexitySignals.js";
import { parseRoleDefinition, matchConcepts } from "../scoring/conceptMatch.js";
import { scoreTrajectory } from "../scoring/trajectoryScore.js";
import type { GitHubRepo } from "../github/fetchRepos.js";

export const ALL_ROLES = ["junior-frontend", "junior-fullstack", "junior-backend", "junior-csharp"] as const;
export type RoleSlug = (typeof ALL_ROLES)[number];

export interface RoleScore {
  role: RoleSlug;
  role_name: string;
  fit_score: number;
  recommendation: "Interview" | "Pass";
  breakdown: { trajectory: number; concept_match: number; complexity: number };
  matched_concepts: string[];
  missing_concepts: string[];
}

export interface AllRolesResult {
  candidate: string;
  best_fit: RoleSlug;
  chart: string;
  roles: RoleScore[];
}

function avgComplexity(repos: GitHubRepo[]): number {
  if (repos.length === 0) return 0;
  const total = repos.reduce((sum, repo) => sum + scoreComplexity(repo), 0);
  return Math.round(total / repos.length);
}

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function buildChart(candidate: string, scores: RoleScore[]): string {
  const best = scores.reduce((a, b) => (b.fit_score > a.fit_score ? b : a));
  const labelWidth = Math.max(...scores.map((s) => s.role_name.length));

  const header = `Role Fit — github.com/${candidate}`;
  const divider = "─".repeat(header.length + 10);

  const rows = scores.map((s) => {
    const label = s.role_name.padEnd(labelWidth);
    const pct = String(s.fit_score).padStart(3) + "%";
    const rec = s.recommendation === "Interview" ? "Interview" : "Pass     ";
    const marker = s.role === best.role ? "  ← best fit" : "";
    return `${label}  [${bar(s.fit_score)}]  ${pct}  ${rec}${marker}`;
  });

  return [header, divider, ...rows, divider, `Top match: ${best.role_name} (${best.fit_score}%)`].join(
    "\n",
  );
}

export async function scoreAllRoles(
  githubUsername: string,
  githubToken: string,
  rolesDir: string,
  graduationDate?: Date | null,
): Promise<AllRolesResult> {
  const repos = await fetchRepos(githubUsername, githubToken);
  const scoringRepos = filterNoise(repos);
  const trajectoryResult = scoreTrajectory(scoringRepos, Date.now(), graduationDate);
  const complexityScore = avgComplexity(scoringRepos);

  const scores: RoleScore[] = ALL_ROLES.map((slug) => {
    const rolePath = resolve(rolesDir, `${slug}.md`);
    const roleMarkdown = readFileSync(rolePath, "utf-8");
    const roleDef = parseRoleDefinition(roleMarkdown);
    const conceptResult = matchConcepts(scoringRepos, roleDef);

    const fit_score = Math.round(
      trajectoryResult.score * 0.45 + conceptResult.score * 0.35 + complexityScore * 0.2,
    );

    return {
      role: slug,
      role_name: roleDef.name,
      fit_score,
      recommendation: fit_score >= 50 ? "Interview" : "Pass",
      breakdown: {
        trajectory: trajectoryResult.score,
        concept_match: conceptResult.score,
        complexity: complexityScore,
      },
      matched_concepts: conceptResult.matchedConcepts,
      missing_concepts: conceptResult.missingConcepts,
    };
  });

  const best = scores.reduce((a, b) => (b.fit_score > a.fit_score ? b : a));

  return {
    candidate: githubUsername,
    best_fit: best.role,
    chart: buildChart(githubUsername, scores),
    roles: scores,
  };
}
