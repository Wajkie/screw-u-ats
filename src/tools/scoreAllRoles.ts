import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchRepos } from "../github/fetchRepos.js";
import { extractLiveUrls } from "../github/extractUrls.js";
import { scoreComplexity, filterNoise } from "../scoring/complexitySignals.js";
import { parseRoleDefinition, matchConcepts } from "../scoring/conceptMatch.js";
import { scoreTrajectory } from "../scoring/trajectoryScore.js";
import { runLighthouseAudits } from "../lighthouse/runAudit.js";
import type { GitHubRepo } from "../github/fetchRepos.js";
import type { CurvePoint } from "../scoring/trajectoryScore.js";
import type { LighthouseEnrichment } from "../lighthouse/runAudit.js";

export const ALL_ROLES = [
  "junior-frontend", "junior-fullstack", "junior-backend", "junior-csharp",
  "mid-frontend", "mid-fullstack", "mid-backend", "mid-csharp",
  "senior-frontend", "senior-fullstack", "senior-backend", "senior-csharp",
] as const;
export type RoleSlug = (typeof ALL_ROLES)[number];
export type Track = "frontend" | "fullstack" | "backend" | "csharp";
export type Tier = "junior" | "mid" | "senior";

export const TRACKS: Track[] = ["frontend", "fullstack", "backend", "csharp"];
export const TIERS: Tier[] = ["junior", "mid", "senior"];

export interface RoleScore {
  role: RoleSlug;
  role_name: string;
  fit_score: number;
  recommendation: "Interview" | "Pass";
  breakdown: { trajectory: number; concept_match: number; complexity: number };
  matched_concepts: string[];
  missing_concepts: string[];
}

export interface TrackGroup {
  track: Track;
  tiers: RoleScore[];
}

export interface TrajectoryInfo {
  score: number;
  summary: string;
  curve: CurvePoint[];
}

export interface AllRolesResult {
  candidate: string;
  best_fit: RoleSlug;
  chart: string;
  roles: RoleScore[];
  tracks: TrackGroup[];
  trajectory: TrajectoryInfo;
  lighthouse?: LighthouseEnrichment;
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildChart(candidate: string, trackGroups: TrackGroup[], best: RoleScore): string {
  const header = `Role Fit — github.com/${candidate}`;
  const divider = "─".repeat(Math.max(header.length + 10, 52));

  const lines: string[] = [header, divider];

  for (const group of trackGroups) {
    if (group.tiers.length === 0) continue;
    lines.push(capitalize(group.track));
    for (const s of group.tiers) {
      const tierLabel = ("  " + capitalize(s.role.split("-")[0])).padEnd(10);
      const pct = String(s.fit_score).padStart(3) + "%";
      const rec = s.recommendation === "Interview" ? "Interview" : "Pass     ";
      const marker = s.role === best.role ? "  ← best fit" : "";
      lines.push(`${tierLabel}  [${bar(s.fit_score)}]  ${pct}  ${rec}${marker}`);
    }
    lines.push("");
  }

  if (lines[lines.length - 1] === "") lines.pop();

  lines.push(divider);
  lines.push(`Best fit: ${best.role_name} (${best.fit_score}%)`);

  return lines.join("\n");
}

function tryScoreRole(
  slug: RoleSlug,
  scoringRepos: GitHubRepo[],
  trajectoryScore: number,
  complexityScore: number,
  rolesDir: string,
): RoleScore | null {
  const rolePath = resolve(rolesDir, `${slug}.md`);
  let roleMarkdown: string;
  try {
    roleMarkdown = readFileSync(rolePath, "utf-8");
  } catch {
    return null;
  }
  const roleDef = parseRoleDefinition(roleMarkdown);
  // Skip stub role files — no concepts defined means the role isn't ready for scoring
  if (roleDef.requiredConcepts.length === 0 && roleDef.bonusConcepts.length === 0) return null;
  const conceptResult = matchConcepts(scoringRepos, roleDef);
  const fit_score = Math.round(
    trajectoryScore * 0.45 + conceptResult.score * 0.35 + complexityScore * 0.2,
  );
  return {
    role: slug,
    role_name: roleDef.name,
    fit_score,
    recommendation: fit_score >= 50 ? "Interview" : "Pass",
    breakdown: { trajectory: trajectoryScore, concept_match: conceptResult.score, complexity: complexityScore },
    matched_concepts: conceptResult.matchedConcepts,
    missing_concepts: conceptResult.missingConcepts,
  };
}

export async function scoreAllRoles(
  githubUsername: string,
  githubToken: string,
  rolesDir: string,
  graduationDate?: Date | null,
  includeLighthouse = false,
  lighthouseApiKey = "",
): Promise<AllRolesResult> {
  const repos = await fetchRepos(githubUsername, githubToken);
  const scoringRepos = filterNoise(repos);
  const trajectoryResult = scoreTrajectory(scoringRepos, Date.now(), graduationDate);
  const complexityScore = avgComplexity(scoringRepos);

  const trackGroups: TrackGroup[] = TRACKS.map((track) => ({
    track,
    tiers: TIERS.flatMap((tier) => {
      const slug = `${tier}-${track}` as RoleSlug;
      const score = tryScoreRole(slug, scoringRepos, trajectoryResult.score, complexityScore, rolesDir);
      return score ? [score] : [];
    }),
  }));

  const roles: RoleScore[] = trackGroups.flatMap((g) => g.tiers);

  const trajectory: TrajectoryInfo = {
    score: trajectoryResult.score,
    summary: trajectoryResult.summary,
    curve: trajectoryResult.curve,
  };

  if (roles.length === 0) {
    return {
      candidate: githubUsername,
      best_fit: "junior-frontend",
      chart: `Role Fit — github.com/${githubUsername}\nNo role definitions available.`,
      roles: [],
      tracks: trackGroups,
      trajectory,
    };
  }

  let lighthouse: LighthouseEnrichment | undefined;
  if (includeLighthouse) {
    const urls = extractLiveUrls(repos);
    lighthouse = await runLighthouseAudits(urls, lighthouseApiKey);
  }

  const best = roles.reduce((a, b) => {
    if (b.fit_score !== a.fit_score) return b.fit_score > a.fit_score ? b : a;
    return b.breakdown.concept_match > a.breakdown.concept_match ? b : a;
  });

  return {
    candidate: githubUsername,
    best_fit: best.role,
    chart: buildChart(githubUsername, trackGroups, best),
    roles,
    tracks: trackGroups,
    trajectory,
    lighthouse,
  };
}
