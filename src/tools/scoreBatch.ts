import { scoreCandidate } from "./scoreCandidate.js";
import type { CandidateScoreResult } from "./scoreCandidate.js";
import { withConcurrency } from "../github/fetchRepos.js";

export interface BatchResult {
  role: string;
  candidates: CandidateScoreResult[];
  chart: string;
}

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function buildChart(role: string, candidates: CandidateScoreResult[]): string {
  if (candidates.length === 0) return `Batch Comparison — ${role}\n(no candidates)`;

  const labelWidth = Math.max(...candidates.map((c) => c.candidate.length));
  const header = `Batch Comparison — ${role}`;
  const divider = "─".repeat(header.length + 10);

  const rows = candidates.map((c, i) => {
    const rank = `#${i + 1}`.padEnd(3);
    const label = c.candidate.padEnd(labelWidth);
    const pct = String(c.fit_score).padStart(3) + "%";
    const rec = c.recommendation === "Interview" ? "Interview" : "Pass     ";
    return `${rank}  ${label}  [${bar(c.fit_score)}]  ${pct}  ${rec}`;
  });

  return [header, divider, ...rows, divider].join("\n");
}

export async function scoreBatch(
  githubUsernames: string[],
  role: string,
  githubToken: string,
  rolesDir: string,
  graduationDate?: Date | null,
): Promise<BatchResult> {
  const results = await withConcurrency(githubUsernames, 5, (username) =>
    scoreCandidate(username, role, githubToken, rolesDir, false, "", graduationDate),
  );

  const candidates = results.sort((a, b) => b.fit_score - a.fit_score);

  return {
    role,
    candidates,
    chart: buildChart(role, candidates),
  };
}
