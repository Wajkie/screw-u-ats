import type { GitHubRepo } from "../github/fetchRepos.js";
import { scoreComplexity } from "./complexitySignals.js";

type BucketKey = "0-3m" | "3-6m" | "6-12m" | "12m+";

const BUCKET_THRESHOLDS_DAYS: Array<[BucketKey, number]> = [
  ["0-3m", 90],
  ["3-6m", 180],
  ["6-12m", 365],
  ["12m+", Infinity],
];

// Recent repos count more — the plan specifies 3x for recent vs 12m+.
const BUCKET_WEIGHTS: Record<BucketKey, number> = {
  "0-3m": 3.0,
  "3-6m": 2.0,
  "6-12m": 1.0,
  "12m+": 0.5,
};

export interface TrajectoryResult {
  score: number;
  summary: string;
  bucketAverages: Partial<Record<BucketKey, number>>;
  /** Newer bucket avg minus older bucket avg. null when only one time range has repos. */
  delta: number | null;
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function bucketKey(ageDays: number): BucketKey {
  for (const [key, maxDays] of BUCKET_THRESHOLDS_DAYS) {
    if (ageDays <= maxDays) return key;
  }
  return "12m+";
}

function buildSummary(
  bucketAverages: Partial<Record<BucketKey, number>>,
  delta: number | null,
  score: number,
): string {
  if (Object.keys(bucketAverages).length === 0) {
    return "No public repositories found.";
  }

  if (delta === null) {
    const hasRecent = "0-3m" in bucketAverages || "3-6m" in bucketAverages;
    if (hasRecent) {
      return score >= 60
        ? "Recent work shows solid complexity. No older repos available to assess growth direction."
        : "Recent activity present but projects lack depth. No older repos to compare.";
    }
    return "Only older repositories found — no recent activity to assess current trajectory.";
  }

  if (delta >= 20) return "Clear growth trajectory — complexity has increased significantly in recent work.";
  if (delta >= 5) return "Positive learning trajectory — recent projects are noticeably more complex than earlier ones.";
  if (delta >= -5) return "Consistent complexity across time periods — steady output without a clear growth direction.";
  if (delta >= -20) return "Slightly declining complexity in recent work compared to earlier projects.";
  return "Declining trajectory — recent work is notably less complex than older projects.";
}

export function scoreTrajectory(repos: GitHubRepo[], now = Date.now()): TrajectoryResult {
  const bucketScores: Record<BucketKey, number[]> = {
    "0-3m": [],
    "3-6m": [],
    "6-12m": [],
    "12m+": [],
  };

  for (const repo of repos) {
    const ageDays = (now - new Date(repo.pushedAt).getTime()) / 86_400_000;
    bucketScores[bucketKey(ageDays)].push(scoreComplexity(repo));
  }

  const bucketAverages: Partial<Record<BucketKey, number>> = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of ["0-3m", "3-6m", "6-12m", "12m+"] as BucketKey[]) {
    const scores = bucketScores[key];
    if (scores.length === 0) continue;
    const bucketAvg = avg(scores);
    bucketAverages[key] = Math.round(bucketAvg);
    weightedSum += bucketAvg * BUCKET_WEIGHTS[key];
    totalWeight += BUCKET_WEIGHTS[key];
  }

  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  const recentScores = [...bucketScores["0-3m"], ...bucketScores["3-6m"]];
  const olderScores = [...bucketScores["6-12m"], ...bucketScores["12m+"]];

  let delta: number | null = null;
  let growthAdjustment = 0;

  if (recentScores.length > 0 && olderScores.length > 0) {
    delta = Math.round(avg(recentScores) - avg(olderScores));
    // Cap bonus/penalty at ±15 points so trajectory can't swamp absolute complexity.
    growthAdjustment = Math.max(-15, Math.min(15, delta * 0.5));
  } else if (recentScores.length === 0 && olderScores.length > 0) {
    // No recent activity — small penalty to signal stagnation.
    growthAdjustment = -10;
  }

  const score = Math.round(Math.min(100, Math.max(0, baseScore + growthAdjustment)));
  const summary = buildSummary(bucketAverages, delta, score);

  return { score, summary, bucketAverages, delta };
}
