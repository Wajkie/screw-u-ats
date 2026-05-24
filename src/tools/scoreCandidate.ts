import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchRepos } from "../github/fetchRepos.js";
import { extractLiveUrls } from "../github/extractUrls.js";
import { scoreComplexity } from "../scoring/complexitySignals.js";
import { parseRoleDefinition, matchConcepts } from "../scoring/conceptMatch.js";
import { scoreTrajectory } from "../scoring/trajectoryScore.js";
import { runLighthouseAudits } from "../lighthouse/runAudit.js";
import type { GitHubRepo } from "../github/fetchRepos.js";
import type { LighthouseEnrichment } from "../lighthouse/runAudit.js";

export interface CandidateScoreResult {
  candidate: string;
  role: string;
  fit_score: number;
  recommendation: "Interview" | "Pass";
  breakdown: {
    trajectory: number;
    concept_match: number;
    complexity: number;
  };
  matched_concepts: string[];
  missing_concepts: string[];
  trajectory_summary: string;
  enrichment?: {
    lighthouse: LighthouseEnrichment;
  };
}

function avgComplexity(repos: GitHubRepo[]): number {
  if (repos.length === 0) return 0;
  const total = repos.reduce((sum, repo) => sum + scoreComplexity(repo), 0);
  return Math.round(total / repos.length);
}

export async function scoreCandidate(
  githubUsername: string,
  role: string,
  githubToken: string,
  rolesDir: string,
  includeLighthouse = false,
  pagespeedApiKey = "",
): Promise<CandidateScoreResult> {
  const rolePath = resolve(rolesDir, `${role}.md`);
  let roleMarkdown: string;
  try {
    roleMarkdown = readFileSync(rolePath, "utf-8");
  } catch {
    throw new Error(`Role definition not found: ${role}`);
  }

  const roleDef = parseRoleDefinition(roleMarkdown);
  const repos = await fetchRepos(githubUsername, githubToken);

  const trajectoryResult = scoreTrajectory(repos);
  const conceptResult = matchConcepts(repos, roleDef);
  const complexityScore = avgComplexity(repos);

  const fit_score = Math.round(
    trajectoryResult.score * 0.45 +
    conceptResult.score * 0.35 +
    complexityScore * 0.20,
  );

  const result: CandidateScoreResult = {
    candidate: githubUsername,
    role,
    fit_score,
    recommendation: fit_score >= 50 ? "Interview" : "Pass",
    breakdown: {
      trajectory: trajectoryResult.score,
      concept_match: conceptResult.score,
      complexity: complexityScore,
    },
    matched_concepts: conceptResult.matchedConcepts,
    missing_concepts: conceptResult.missingConcepts,
    trajectory_summary: trajectoryResult.summary,
  };

  if (includeLighthouse) {
    const urls = extractLiveUrls(repos);
    const lighthouse = await runLighthouseAudits(urls, pagespeedApiKey);
    result.enrichment = { lighthouse };
  }

  return result;
}
