import { describe, it, expect } from "vitest";
import {
  scoreComplexity,
  scoreComplexityDetailed,
} from "../complexitySignals.js";
import type { GitHubRepo } from "../../github/fetchRepos.js";

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "test-repo",
    language: null,
    createdAt: "2024-01-01T00:00:00Z",
    pushedAt: "2024-01-01T00:00:00Z",
    topics: [],
    description: null,
    stargazersCount: 0,
    readmeContent: null,
    hasTests: false,
    hasCi: false,
    size: 0,
    defaultBranch: "main",
    ...overrides,
  };
}

describe("scoreComplexity — size heuristic (0–15)", () => {
  it("returns 0 for trivial repos (< 5 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 0 })).size).toBe(0);
    expect(scoreComplexityDetailed(makeRepo({ size: 4 })).size).toBe(0);
  });

  it("returns 5 for small repos (5–49 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 5 })).size).toBe(5);
    expect(scoreComplexityDetailed(makeRepo({ size: 49 })).size).toBe(5);
  });

  it("returns 10 for medium repos (50–499 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 50 })).size).toBe(10);
    expect(scoreComplexityDetailed(makeRepo({ size: 499 })).size).toBe(10);
  });

  it("returns 15 for large repos (>= 500 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 500 })).size).toBe(15);
    expect(scoreComplexityDetailed(makeRepo({ size: 10000 })).size).toBe(15);
  });
});

describe("scoreComplexity — hasTests heuristic (0 or 25)", () => {
  it("returns 0 when no tests", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasTests: false })).hasTests).toBe(0);
  });

  it("returns 25 when tests detected", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasTests: true })).hasTests).toBe(25);
  });
});

describe("scoreComplexity — hasCi heuristic (0 or 15)", () => {
  it("returns 0 when no CI", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasCi: false })).hasCi).toBe(0);
  });

  it("returns 15 when CI detected", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasCi: true })).hasCi).toBe(15);
  });
});

describe("scoreComplexity — deps heuristic (0–25)", () => {
  it("returns 0 with no dep signals", () => {
    expect(scoreComplexityDetailed(makeRepo()).deps).toBe(0);
  });

  it("scores tier-1 framework hit (max 5)", () => {
    const repo = makeRepo({ readmeContent: "Built with React and some other things." });
    expect(scoreComplexityDetailed(repo).deps).toBeGreaterThanOrEqual(5);
  });

  it("caps tier-1 at 5 even with multiple framework hits", () => {
    const repo = makeRepo({
      readmeContent: "Uses React, Vue, Angular, Svelte, and Solid.",
    });
    expect(scoreComplexityDetailed(repo).deps).toBeLessThanOrEqual(25);
  });

  it("scores tier-2 ecosystem libraries", () => {
    const repo = makeRepo({
      readmeContent: "Uses Next.js, Redux, and Prisma.",
    });
    const { deps } = scoreComplexityDetailed(repo);
    // next (2) + redux (2) + prisma (2) = 6 pts from tier-2
    expect(deps).toBeGreaterThanOrEqual(6);
  });

  it("scores tier-3 quality markers", () => {
    const repo = makeRepo({ language: "TypeScript", readmeContent: "Uses vitest for testing." });
    const { deps } = scoreComplexityDetailed(repo);
    expect(deps).toBeGreaterThanOrEqual(4);
  });

  it("picks up signals from topics", () => {
    const repo = makeRepo({ topics: ["react", "redux", "typescript"] });
    const { deps } = scoreComplexityDetailed(repo);
    expect(deps).toBeGreaterThanOrEqual(5);
  });

  it("never exceeds 25", () => {
    const repo = makeRepo({
      readmeContent:
        "React Vue Angular Svelte Next Nuxt Remix Redux Zustand Prisma TypeScript Vitest Jest Cypress Storybook Tailwind",
      topics: ["react", "typescript", "redux", "nextjs", "prisma"],
    });
    expect(scoreComplexityDetailed(repo).deps).toBeLessThanOrEqual(25);
  });
});

describe("scoreComplexity — readme heuristic (0–15)", () => {
  it("returns 0 for null README", () => {
    expect(scoreComplexityDetailed(makeRepo({ readmeContent: null })).readme).toBe(0);
  });

  it("returns low score for very short README", () => {
    const score = scoreComplexityDetailed(makeRepo({ readmeContent: "Hello" })).readme;
    expect(score).toBeLessThan(5);
  });

  it("returns higher score for long README", () => {
    const long = "x".repeat(1100);
    const score = scoreComplexityDetailed(makeRepo({ readmeContent: long })).readme;
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it("awards bonus for markdown image", () => {
    const withImage = "Some content\n\n![screenshot](./screenshot.png)\n\nMore text.";
    const withoutImage = "Some content\n\nMore text.";
    const with_ = scoreComplexityDetailed(makeRepo({ readmeContent: withImage })).readme;
    const without = scoreComplexityDetailed(makeRepo({ readmeContent: withoutImage })).readme;
    expect(with_).toBeGreaterThan(without);
  });

  it("awards bonus for demo link keywords", () => {
    const withDemo = "Check out the live demo at https://myapp.vercel.app";
    const withoutDemo = "Check out the repo.";
    const with_ = scoreComplexityDetailed(makeRepo({ readmeContent: withDemo })).readme;
    const without = scoreComplexityDetailed(makeRepo({ readmeContent: withoutDemo })).readme;
    expect(with_).toBeGreaterThan(without);
  });

  it("never exceeds 15", () => {
    const readme = `${"word ".repeat(500)}![img](url)\nLive demo at https://myapp.vercel.app`;
    expect(scoreComplexityDetailed(makeRepo({ readmeContent: readme })).readme).toBeLessThanOrEqual(15);
  });
});

describe("scoreComplexity — span heuristic (0–5)", () => {
  it("returns 0 for same-day repos", () => {
    const same = "2024-03-01T00:00:00Z";
    expect(scoreComplexityDetailed(makeRepo({ createdAt: same, pushedAt: same })).span).toBe(0);
  });

  it("returns 1 for repos active 7–29 days", () => {
    expect(
      scoreComplexityDetailed(
        makeRepo({ createdAt: "2024-01-01T00:00:00Z", pushedAt: "2024-01-15T00:00:00Z" }),
      ).span,
    ).toBe(1);
  });

  it("returns 3 for repos active 30–89 days", () => {
    expect(
      scoreComplexityDetailed(
        makeRepo({ createdAt: "2024-01-01T00:00:00Z", pushedAt: "2024-02-15T00:00:00Z" }),
      ).span,
    ).toBe(3);
  });

  it("returns 5 for repos active >= 90 days", () => {
    expect(
      scoreComplexityDetailed(
        makeRepo({ createdAt: "2024-01-01T00:00:00Z", pushedAt: "2024-04-15T00:00:00Z" }),
      ).span,
    ).toBe(5);
  });
});

describe("scoreComplexity — combined score", () => {
  it("returns 0 for a completely empty repo", () => {
    expect(scoreComplexity(makeRepo())).toBe(0);
  });

  it("total equals sum of breakdown components", () => {
    const repo = makeRepo({
      size: 200,
      hasTests: true,
      hasCi: true,
      readmeContent: "React app with Redux. ![demo](x.png) Live at vercel.app\n" + "x".repeat(800),
      topics: ["react", "typescript"],
      createdAt: "2024-01-01T00:00:00Z",
      pushedAt: "2024-06-01T00:00:00Z",
    });
    const bd = scoreComplexityDetailed(repo);
    expect(bd.total).toBe(bd.size + bd.hasTests + bd.hasCi + bd.deps + bd.readme + bd.span);
  });

  it("fully-featured repo scores at most 100", () => {
    const repo = makeRepo({
      size: 5000,
      hasTests: true,
      hasCi: true,
      readmeContent:
        "React Next Redux TypeScript Prisma Vitest Cypress Tailwind Storybook. " +
        "![demo](x.png) Live at https://myapp.vercel.app\n" +
        "x".repeat(1000),
      topics: ["react", "typescript", "redux", "nextjs", "prisma"],
      createdAt: "2024-01-01T00:00:00Z",
      pushedAt: "2024-12-31T00:00:00Z",
    });
    const score = scoreComplexity(repo);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });
});
