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
    highlights: [],
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

describe("scoreTrajectory -- empty input", () => {
  it("returns score 0 and empty bucket averages for no repos", () => {
    const result = scoreTrajectory([], NOW);
    expect(result.score).toBe(0);
    expect(result.delta).toBeNull();
    expect(result.bucketAverages).toEqual({});
    expect(result.curve).toEqual([]);
    expect(result.summary).toMatch(/no public repositories/i);
  });
});

describe("scoreTrajectory -- single time range (no delta)", () => {
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

describe("scoreTrajectory -- growing candidate", () => {
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

describe("scoreTrajectory -- flat candidate", () => {
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

describe("scoreTrajectory -- regressing candidate", () => {
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

describe("scoreTrajectory -- bucket assignment", () => {
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

describe("scoreTrajectory -- score bounds", () => {
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

describe("scoreTrajectory -- curve field", () => {
  it("curve contains one entry per non-empty bucket, ordered oldest-first", () => {
    const repos = [
      complexRepo(400), // 12m+
      complexRepo(250), // 6-12m
      complexRepo(120), // 3-6m
    ];
    const result = scoreTrajectory(repos, NOW);
    expect(result.curve).toHaveLength(3);
    expect(result.curve.map((p) => p.period)).toEqual(["12m+", "6-12m", "3-6m"]);
  });

  it("curve omits empty buckets", () => {
    const repos = [complexRepo(10), complexRepo(400)]; // 0-3m and 12m+ only
    const result = scoreTrajectory(repos, NOW);
    const periods = result.curve.map((p) => p.period);
    expect(periods).toContain("12m+");
    expect(periods).toContain("0-3m");
    expect(periods).not.toContain("3-6m");
    expect(periods).not.toContain("6-12m");
  });

  it("curve entries have correct repoCount and avgComplexity", () => {
    const repos = [complexRepo(10), complexRepo(30)]; // two repos in 0-3m
    const result = scoreTrajectory(repos, NOW);
    expect(result.curve).toHaveLength(1);
    const [point] = result.curve;
    expect(point!.period).toBe("0-3m");
    expect(point!.repoCount).toBe(2);
    expect(point!.avgComplexity).toBeGreaterThan(0);
    expect(point!.avgComplexity).toBeLessThanOrEqual(100);
  });

  it("curve is ordered oldest-first when all four buckets are populated", () => {
    const repos = [
      complexRepo(10),  // 0-3m
      complexRepo(120), // 3-6m
      complexRepo(250), // 6-12m
      complexRepo(400), // 12m+
    ];
    const result = scoreTrajectory(repos, NOW);
    expect(result.curve).toHaveLength(4);
    expect(result.curve.map((p) => p.period)).toEqual(["12m+", "6-12m", "3-6m", "0-3m"]);
  });
});

describe("scoreTrajectory -- graduation date", () => {
  // Graduation = 60 days before NOW. Pre-grad = anything pushed before that.
  const GRAD = new Date(NOW - 60 * 86_400_000);

  it("routes pre-graduation repos into pre-grad bucket", () => {
    const repos = [
      trivialRepo(200), // 200 days ago < graduation → pre-grad
      complexRepo(10),  // 10 days ago > graduation → 0-3m
    ];
    const result = scoreTrajectory(repos, NOW, GRAD);
    expect("pre-grad" in result.bucketAverages).toBe(true);
    expect("0-3m" in result.bucketAverages).toBe(true);
  });

  it("delta compares post-grad (recent) vs pre-grad (older)", () => {
    const repos = [
      trivialRepo(200), // pre-grad school project
      complexRepo(10),  // post-grad quality work
    ];
    const result = scoreTrajectory(repos, NOW, GRAD);
    expect(result.delta).not.toBeNull();
    expect(result.delta!).toBeGreaterThan(0); // post-grad more complex than pre-grad
  });

  it("graduation filter raises score vs no graduation filter for candidate with school noise", () => {
    const repos = [
      trivialRepo(400), // school noise
      trivialRepo(300), // school noise
      trivialRepo(200), // school noise
      complexRepo(10),  // post-grad quality work
      complexRepo(30),  // post-grad quality work
    ];
    const withGrad = scoreTrajectory(repos, NOW, GRAD);
    const withoutGrad = scoreTrajectory(repos, NOW);
    expect(withGrad.score).toBeGreaterThan(withoutGrad.score);
  });

  it("curve places pre-grad first (oldest) when present", () => {
    const repos = [trivialRepo(200), complexRepo(10)];
    const result = scoreTrajectory(repos, NOW, GRAD);
    expect(result.curve[0]!.period).toBe("pre-grad");
  });

  it("without graduation date, behaves identically to existing logic", () => {
    const repos = [complexRepo(10), complexRepo(400)];
    const withNull = scoreTrajectory(repos, NOW, null);
    const withUndefined = scoreTrajectory(repos, NOW);
    expect(withNull.score).toBe(withUndefined.score);
    expect(withNull.delta).toBe(withUndefined.delta);
  });
});
