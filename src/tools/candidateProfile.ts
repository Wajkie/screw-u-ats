import { fetchRepos } from "../github/fetchRepos.js";
import { filterNoise, scoreComplexity } from "../scoring/complexitySignals.js";
import { scoreTrajectory } from "../scoring/trajectoryScore.js";
import { computeSkillMap } from "../scoring/skillMap.js";
import { buildRepoSummaries } from "./scoreCandidate.js";
import type { RepoSummary } from "./scoreCandidate.js";
import type { SkillMap } from "../scoring/skillMap.js";
import type { GitHubRepo } from "../github/fetchRepos.js";

export interface CandidateProfileResult {
  candidate: string;
  repo_count: number;
  active_since: string | null;
  last_active: string | null;
  top_languages: string[];
  skill_map: SkillMap;
  avg_complexity: number;
  trajectory_summary: string;
  top_repos: RepoSummary[];
  suggested_roles: string[];
}

function topLanguages(repos: GitHubRepo[]): string[] {
  const counts: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) counts[repo.language] = (counts[repo.language] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);
}

function suggestRoles(skillMap: SkillMap, avgComplexity: number, hasCsharp: boolean): string[] {
  const tier = avgComplexity < 35 ? "junior" : avgComplexity < 60 ? "mid" : "senior";
  const { frontend, backend } = skillMap;
  const suggestions: string[] = [];

  if (hasCsharp) suggestions.push(`${tier}-csharp`);

  if (frontend >= 60 && backend < 50) {
    suggestions.push(`${tier}-frontend`);
  } else if (backend >= 60 && frontend < 50) {
    suggestions.push(`${tier}-backend`);
  } else if (frontend >= 50 && backend >= 50) {
    suggestions.push(`${tier}-fullstack`);
  } else if (frontend >= backend) {
    suggestions.push(`${tier}-frontend`);
  } else {
    suggestions.push(`${tier}-backend`);
  }

  return suggestions;
}

export async function candidateProfile(
  githubUsername: string,
  githubToken: string,
  graduationDate?: Date | null,
): Promise<CandidateProfileResult> {
  const repos = await fetchRepos(githubUsername, githubToken);
  const scoringRepos = filterNoise(repos);

  const trajectoryResult = scoreTrajectory(scoringRepos, Date.now(), graduationDate);
  const skillMap = computeSkillMap(scoringRepos);
  const { top } = buildRepoSummaries(repos, githubUsername);

  const avgComplexity =
    scoringRepos.length === 0
      ? 0
      : Math.round(
          scoringRepos.reduce((sum, r) => sum + scoreComplexity(r), 0) / scoringRepos.length,
        );

  const hasCsharp = repos.some((r) => r.hasCsFiles || r.csprojDeps.length > 0);

  const sorted = [...repos].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const active_since = sorted[0]?.createdAt ?? null;
  const last_active =
    repos.length === 0
      ? null
      : repos.reduce((latest, r) =>
          new Date(r.pushedAt) > new Date(latest.pushedAt) ? r : latest,
        ).pushedAt;

  return {
    candidate: githubUsername,
    repo_count: repos.length,
    active_since,
    last_active,
    top_languages: topLanguages(repos),
    skill_map: skillMap,
    avg_complexity: avgComplexity,
    trajectory_summary: trajectoryResult.summary,
    top_repos: top,
    suggested_roles: suggestRoles(skillMap, avgComplexity, hasCsharp),
  };
}
