import { describe, it, expect } from "vitest";
import { computeActivitySignal } from "../activitySignal.js";
import type { GitHubRepo } from "../../github/repoTypes.js";

// Fixed "now": 2026-06-03T00:00:00Z
const NOW = new Date("2026-06-03T00:00:00Z").getTime();

function daysAgo(days: number): string {
  return new Date(NOW - days * 86_400_000).toISOString();
}

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "repo",
    language: null,
    isFork: false,
    createdAt: daysAgo(365),
    pushedAt: daysAgo(30),
    topics: [],
    description: null,
    homepage: null,
    stargazersCount: 0,
    readmeContent: null,
    hasTests: false,
    hasCi: false,
    size: 0,
    defaultBranch: "main",
    hasAppRouter: false,
    hasHooksDir: false,
    hasLibDir: false,
    hasActionsDir: false,
    hasCsFiles: false,
    packageDeps: [],
    csprojDeps: [],
    highlights: [],
    ...overrides,
  };
}

describe("computeActivitySignal", () => {
  it("returns zeroed signal for empty repo list", () => {
    const result = computeActivitySignal([], NOW);
    expect(result).toEqual({
      last_pushed_at: "",
      repos_last_90d: 0,
      repos_last_180d: 0,
      total_original_repos: 0,
      account_age_months: 0,
      is_recently_active: false,
    });
  });

  it("counts repos pushed within 90 and 180 day windows", () => {
    const repos = [
      makeRepo({ pushedAt: daysAgo(30) }),  // within 90d and 180d
      makeRepo({ pushedAt: daysAgo(100) }), // within 180d only
      makeRepo({ pushedAt: daysAgo(200) }), // outside both
    ];
    const result = computeActivitySignal(repos, NOW);
    expect(result.repos_last_90d).toBe(1);
    expect(result.repos_last_180d).toBe(2);
  });

  it("sets is_recently_active true when any push within 90 days", () => {
    const repos = [makeRepo({ pushedAt: daysAgo(45) })];
    expect(computeActivitySignal(repos, NOW).is_recently_active).toBe(true);
  });

  it("sets is_recently_active false when no push within 90 days", () => {
    const repos = [makeRepo({ pushedAt: daysAgo(91) })];
    expect(computeActivitySignal(repos, NOW).is_recently_active).toBe(false);
  });

  it("uses most recent pushedAt as last_pushed_at", () => {
    const repos = [
      makeRepo({ pushedAt: daysAgo(60) }),
      makeRepo({ pushedAt: daysAgo(10) }),
      makeRepo({ pushedAt: daysAgo(120) }),
    ];
    const result = computeActivitySignal(repos, NOW);
    expect(result.last_pushed_at).toBe(new Date(NOW - 10 * 86_400_000).toISOString());
  });

  it("counts only non-fork repos in total_original_repos", () => {
    const repos = [
      makeRepo({ isFork: false }),
      makeRepo({ isFork: true }),
      makeRepo({ isFork: false }),
    ];
    expect(computeActivitySignal(repos, NOW).total_original_repos).toBe(2);
  });

  it("returns zero original repos when all are forks", () => {
    const repos = [makeRepo({ isFork: true }), makeRepo({ isFork: true })];
    expect(computeActivitySignal(repos, NOW).total_original_repos).toBe(0);
  });

  it("treats undefined isFork as non-fork", () => {
    const repo = makeRepo();
    delete (repo as Partial<GitHubRepo>).isFork;
    expect(computeActivitySignal([repo], NOW).total_original_repos).toBe(1);
  });

  it("computes account_age_months from oldest createdAt", () => {
    const repos = [
      makeRepo({ createdAt: daysAgo(365) }),
      makeRepo({ createdAt: daysAgo(730) }), // oldest
    ];
    const result = computeActivitySignal(repos, NOW);
    // 730 days / 30.44 ≈ 23 months
    expect(result.account_age_months).toBe(23);
  });

  it("handles a single repo correctly", () => {
    const repo = makeRepo({ pushedAt: daysAgo(20), createdAt: daysAgo(100), isFork: false });
    const result = computeActivitySignal([repo], NOW);
    expect(result.repos_last_90d).toBe(1);
    expect(result.repos_last_180d).toBe(1);
    expect(result.total_original_repos).toBe(1);
    expect(result.is_recently_active).toBe(true);
    expect(result.account_age_months).toBe(3);
  });
});
