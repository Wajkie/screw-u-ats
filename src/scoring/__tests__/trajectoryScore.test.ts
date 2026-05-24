import { describe, it, expect } from "vitest";
import { scoreTrajectory } from "../trajectoryScore.js";
import type { GitHubRepo } from "../../github/fetchRepos.js";

// Fixed "now" so tests are not time-dependent.
// 2025-06-01T00:00:00Z = 1748736000000
const NOW = new Date("2025-06-01T00:00:00Z").getTime();

function daysAgo(days: number): string {
  return new Date(NOW - days * 86_400_000).toISOString();
}

function makeRepo(pushedDaysAgo: number, overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "repo",
    language: null,
    createdAt: daysAgo(pushedDaysAgo + 30),
    pushedAt: daysAgo(pushedDaysAgo),
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
    ...overrides,
  };
}

// A high-complexity repo fixture: tests + CI + decent size + React README.
function complexRepo(pushedDaysAgo: number): GitHubRepo {
  return makeRepo(pushedDaysAgo, {
    size: 200,
    hasTests: true,
    hasCi: true,
    readmeContent: "React app with routing and Redux. Live at https://myapp.vercel.app\n" + "x".repeat(800),
    topics: ["react", "typescript"],
  });
}

// A trivial repo: no tests, no CI, no meaningful content.
function trivialRepo(pushedDaysAgo: number): GitHubRepo {
  return makeRepo(pushedDaysAgo, { size: 2 });
}

describe("scoreTrajectory â€” empty input", () => {
  it("returns score 0 and empty bucket averages for no repos", () => {
    const result = scoreTrajectory([], NOW);
    expect(result.score).toBe(0);
    expect(result.delta).toBeNull();
    expect(result.bucketAverages).toEqual({});
    expect(result.summary).toMatch(/no public repositories/i);
  });
});

describe("scoreTrajectory â€” single time range (no delta)", () => {
  it("scores only-recent repos without delta", () => {
    const repos = [complexRepo(10), complexRepo(30), complexRepo(60)];
    const result = scoreTrajectory(repos, NOW);
    expect(result.delta).toBeNull();
    expect(result.score).toBeGreaterThan(0);
    expect("0-3m" in result.bucketAverages || "3-6m" in result.bucketAverages).toBe(true);
  });

  it("penalises candidates with only old repos (no recent activity)", () => {
    const recentOnly = [complexRepo(10), complexRepo(30)];
    const oldOnly = [complexRepo(400), complexRepo(500)];
    const recentResult = scoreTrajectory(recentOnly, NOW);
    const oldResult = scoreTrajectory(oldOnly, NOW);
    expect(recentResult.score).toBeGreaterThan(oldResult.score);
    expect(oldResult.summary).toMatch(/no recent activity/i);
  });
});

describe("scoreTrajectory â€” growing candidate", () => {
  it("produces positive delta and higher score than a flat candidate", () => {
    // Growing: trivial old work, complex recent work.
    const growing = [
      trivialRepo(400),
      trivialRepo(500),
      complexRepo(20),
      complexRepo(60),
    ];
    const flat = [
      makeRepo(400, { size: 100, hasTests: true }),
      makeRepo(500, { size: 100, hasTests: true }),
      makeRepo(20, { size: 100, hasTests: true }),
      makeRepo(60, { size: 100, hasTests: true }),
    ];

    const growingResult = scoreTrajectory(growing, NOW);
    const flatResult = scoreTrajectory(flat, NOW);

    expect(growingResult.delta).not.toBeNull();
    expect(growingResult.delta!).toBeGreaterThan(0);
    expect(growingResult.score).toBeGreaterThan(flatResult.score);
    expect(growingResult.summary).toMatch(/trajectory|growth/i);
  });
});

describe("scoreTrajectory â€” flat candidate", () => {
  it("produces delta near zero for consistent complexity over time", () => {
    const repos = [
      makeRepo(20, { size: 100, hasTests: true }),
      makeRepo(200, { size: 100, hasTests: true }),
      makeRepo(400, { size: 100, hasTests: true }),
    ];
    const result = scoreTrajectory(repos, NOW);
    expect(result.delta).not.toBeNull();
    expect(Math.abs(result.delta!)).toBeLessThan(10);
    expect(result.summary).toMatch(/consistent/i);
  });
});

describe("scoreTrajectory â€” regressing candidate", () => {
  it("produces negative delta when older repos are more complex", () => {
    const regressing = [
      complexRepo(400),
      complexRepo(500),
      trivialRepo(20),
      trivialRepo(60),
    ];
    const result = scoreTrajectory(regressing, NOW);
    expect(result.delta).not.toBeNull();
    expect(result.delta!).toBeLessThan(0);
    expect(result.summary).toMatch(/declin/i);
  });

  it("regressing candidate scores lower than a growing candidate", () => {
    const growing = [trivialRepo(400), complexRepo(20)];
    const regressing = [complexRepo(400), trivialRepo(20)];
    const growingResult = scoreTrajectory(growing, NOW);
    const regressingResult = scoreTrajectory(regressing, NOW);
    expect(growingResult.score).toBeGreaterThan(regressingResult.score);
  });
});

describe("scoreTrajectory â€” bucket assignment", () => {
  it("places repos into correct buckets by pushedAt age", () => {
    const repos = [
      complexRepo(120), // 3-6m (91-180 days)
      complexRepo(250), // 6-12m (181-365 days)
      complexRepo(400), // 12m+ (366+ days)
    ];
    const result = scoreTrajectory(repos, NOW);
    expect("3-6m" in result.bucketAverages).toBe(true);
    expect("6-12m" in result.bucketAverages).toBe(true);
    expect("12m+" in result.bucketAverages).toBe(true);
    expect("0-3m" in result.bucketAverages).toBe(false);
  });
});

describe("scoreTrajectory â€” score bounds", () => {
  it("score is always in [0, 100]", () => {
    const manyComplex = Array.from({ length: 20 }, (_, i) => complexRepo(i * 5));
    const manyTrivial = Array.from({ length: 20 }, (_, i) => trivialRepo(i * 5));
    expect(scoreTrajectory(manyComplex, NOW).score).toBeLessThanOrEqual(100);
    expect(scoreTrajectory(manyTrivial, NOW).score).toBeGreaterThanOrEqual(0);
  });

  it("fully complex recent work scores higher than fully trivial recent work", () => {
    const highScore = scoreTrajectory([complexRepo(10), complexRepo(30)], NOW).score;
    const lowScore = scoreTrajectory([trivialRepo(10), trivialRepo(30)], NOW).score;
    expect(highScore).toBeGreaterThan(lowScore);
  });
});


