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
    homepage: null,
    stargazersCount: 0,
    readmeContent: null,
    hasTests: false,
    hasCi: false,
    hasAppRouter: false,
    hasHooksDir: false,
    hasLibDir: false,
    hasActionsDir: false,
    packageDeps: [],
    csprojDeps: [],
    size: 0,
    defaultBranch: "main",
    ...overrides,
  };
}

describe("scoreComplexity â€” size heuristic (0â€“15)", () => {
  it("returns 0 for trivial repos (< 5 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 0 })).size).toBe(0);
    expect(scoreComplexityDetailed(makeRepo({ size: 4 })).size).toBe(0);
  });

  it("returns 5 for small repos (5â€“49 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 5 })).size).toBe(5);
    expect(scoreComplexityDetailed(makeRepo({ size: 49 })).size).toBe(5);
  });

  it("returns 10 for medium repos (50â€“499 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 50 })).size).toBe(10);
    expect(scoreComplexityDetailed(makeRepo({ size: 499 })).size).toBe(10);
  });

  it("returns 15 for large repos (>= 500 KB)", () => {
    expect(scoreComplexityDetailed(makeRepo({ size: 500 })).size).toBe(15);
    expect(scoreComplexityDetailed(makeRepo({ size: 10000 })).size).toBe(15);
  });
});

describe("scoreComplexity â€” hasTests heuristic (0 or 25)", () => {
  it("returns 0 when no tests", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasTests: false })).hasTests).toBe(0);
  });

  it("returns 25 when tests detected", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasTests: true })).hasTests).toBe(25);
  });
});

describe("scoreComplexity â€” hasCi heuristic (0 or 15)", () => {
  it("returns 0 when no CI", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasCi: false })).hasCi).toBe(0);
  });

  it("returns 15 when CI detected", () => {
    expect(scoreComplexityDetailed(makeRepo({ hasCi: true })).hasCi).toBe(15);
  });
});

describe("scoreComplexity â€” deps heuristic (0â€“20)", () => {
  it("returns 0 with no dep signals", () => {
    expect(scoreComplexityDetailed(makeRepo()).deps).toBe(0);
  });

  it("scores tier-1 framework from packageDeps", () => {
    const repo = makeRepo({ packageDeps: ["react", "react-dom"] });
    expect(scoreComplexityDetailed(repo).deps).toBeGreaterThanOrEqual(5);
  });

  it("falls back to text matching when packageDeps is empty", () => {
    const repo = makeRepo({ readmeContent: "Built with React." });
    expect(scoreComplexityDetailed(repo).deps).toBeGreaterThanOrEqual(5);
  });

  it("does NOT text-match when packageDeps is present", () => {
    // packageDeps is set but does not include react â€” text match is bypassed
    const repo = makeRepo({
      readmeContent: "Built with React and Next.js.",
      packageDeps: ["some-other-dep"],
    });
    expect(scoreComplexityDetailed(repo).deps).toBe(0);
  });

  it("scores tier-2 ecosystem libraries from packageDeps", () => {
    const repo = makeRepo({ packageDeps: ["react", "next", "redux", "@prisma/client"] });
    const { deps } = scoreComplexityDetailed(repo);
    // react(5) + next(2) + redux(2) + prisma(2) = 11
    expect(deps).toBeGreaterThanOrEqual(11);
  });

  it("scores tier-3 quality markers from packageDeps", () => {
    const repo = makeRepo({ packageDeps: ["typescript", "vitest"] });
    expect(scoreComplexityDetailed(repo).deps).toBeGreaterThanOrEqual(4);
  });

  it("scores tier-4 modern libraries from packageDeps", () => {
    const repo = makeRepo({ packageDeps: ["react", "zod", "react-hook-form"] });
    const { deps } = scoreComplexityDetailed(repo);
    expect(deps).toBeGreaterThan(5); // react(5) + at least 1 from tier-4
  });

  it("never exceeds 20", () => {
    const repo = makeRepo({
      packageDeps: [
        "react", "vue", "next", "nuxt", "remix", "redux", "zustand", "prisma",
        "kysely", "typescript", "vitest", "jest", "cypress", "tailwindcss",
        "zod", "react-hook-form", "framer-motion",
      ],
    });
    expect(scoreComplexityDetailed(repo).deps).toBeLessThanOrEqual(20);
  });
});

describe("scoreComplexity â€” architecture heuristic (0â€“10)", () => {
  it("returns 0 with no architecture signals", () => {
    expect(scoreComplexityDetailed(makeRepo()).architecture).toBe(0);
  });

  it("scores App Router presence", () => {
    const repo = makeRepo({ hasAppRouter: true });
    expect(scoreComplexityDetailed(repo).architecture).toBeGreaterThan(0);
  });

  it("scores hooks/ directory", () => {
    const repo = makeRepo({ hasHooksDir: true });
    expect(scoreComplexityDetailed(repo).architecture).toBeGreaterThan(0);
  });

  it("scores lib/ directory", () => {
    const repo = makeRepo({ hasLibDir: true });
    expect(scoreComplexityDetailed(repo).architecture).toBeGreaterThan(0);
  });

  it("scores actions/ directory", () => {
    const repo = makeRepo({ hasActionsDir: true });
    expect(scoreComplexityDetailed(repo).architecture).toBeGreaterThan(0);
  });

  it("full architecture (App Router + hooks + lib + actions) scores higher than basic React", () => {
    const nextApp = makeRepo({ hasAppRouter: true, hasHooksDir: true, hasLibDir: true, hasActionsDir: true });
    const basicReact = makeRepo();
    expect(scoreComplexityDetailed(nextApp).architecture).toBeGreaterThan(
      scoreComplexityDetailed(basicReact).architecture,
    );
  });

  it("never exceeds 10", () => {
    const repo = makeRepo({ hasAppRouter: true, hasHooksDir: true, hasLibDir: true, hasActionsDir: true });
    expect(scoreComplexityDetailed(repo).architecture).toBeLessThanOrEqual(10);
  });
});

describe("scoreComplexity â€” readme heuristic (0â€“10)", () => {
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
    expect(score).toBeGreaterThanOrEqual(7);
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

  it("never exceeds 10", () => {
    const readme = `${"word ".repeat(500)}![img](url)\nLive demo at https://myapp.vercel.app`;
    expect(scoreComplexityDetailed(makeRepo({ readmeContent: readme })).readme).toBeLessThanOrEqual(10);
  });
});

describe("scoreComplexity â€” span heuristic (0â€“5)", () => {
  it("returns 0 for same-day repos", () => {
    const same = "2024-03-01T00:00:00Z";
    expect(scoreComplexityDetailed(makeRepo({ createdAt: same, pushedAt: same })).span).toBe(0);
  });

  it("returns 1 for repos active 7â€“29 days", () => {
    expect(
      scoreComplexityDetailed(
        makeRepo({ createdAt: "2024-01-01T00:00:00Z", pushedAt: "2024-01-15T00:00:00Z" }),
      ).span,
    ).toBe(1);
  });

  it("returns 3 for repos active 30â€“89 days", () => {
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

describe("scoreComplexity â€” combined score", () => {
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
    expect(bd.total).toBe(
      Math.min(bd.size + bd.hasTests + bd.hasCi + bd.deps + bd.architecture + bd.readme + bd.span, 100),
    );
  });

  it("fully-featured repo scores at most 100", () => {
    const repo = makeRepo({
      size: 5000,
      hasTests: true,
      hasCi: true,
      hasAppRouter: true,
      hasHooksDir: true,
      hasLibDir: true,
      hasActionsDir: true,
      packageDeps: ["react", "next", "redux", "typescript", "vitest", "tailwindcss", "prisma", "zod"],
      readmeContent: "![demo](x.png) Live at https://myapp.vercel.app\n" + "x".repeat(1000),
      createdAt: "2024-01-01T00:00:00Z",
      pushedAt: "2024-12-31T00:00:00Z",
    });
    const score = scoreComplexity(repo);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("ASP.NET project scores from csprojDeps", () => {
    const aspNet = makeRepo({
      size: 300,
      hasTests: true,
      hasCi: true,
      language: "C#",
      csprojDeps: [
        "Microsoft.AspNetCore.OpenApi",
        "Microsoft.EntityFrameworkCore.Npgsql",
        "xunit",
        "FluentValidation.AspNetCore",
        "MediatR",
        "Serilog.AspNetCore",
      ],
    });
    const score = scoreComplexity(aspNet);
    expect(score).toBeGreaterThan(50);
  });

  it("Next.js App Router project scores meaningfully higher than basic React todo", () => {
    const nextApp = makeRepo({
      size: 300,
      hasTests: true,
      hasCi: true,
      hasAppRouter: true,
      hasHooksDir: true,
      hasLibDir: true,
      hasActionsDir: true,
      packageDeps: ["react", "next", "typescript", "tailwindcss", "zod", "kysely"],
    });
    const reactTodo = makeRepo({
      size: 20,
      packageDeps: ["react", "react-dom"],
    });
    expect(scoreComplexity(nextApp)).toBeGreaterThan(scoreComplexity(reactTodo) + 20);
  });
});

