import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve } from "path";

vi.mock("../../github/fetchRepos.js");

import { fetchRepos } from "../../github/fetchRepos.js";
import { scoreCandidate } from "../scoreCandidate.js";
import type { GitHubRepo } from "../../github/fetchRepos.js";

const mockFetchRepos = vi.mocked(fetchRepos);

const rolesDir = resolve(__dirname, "../../../knowledge/roles");

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "test-repo",
    language: null,
    createdAt: "2024-01-01T00:00:00Z",
    pushedAt: "2025-05-01T00:00:00Z",
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

beforeEach(() => {
  mockFetchRepos.mockReset();
});

describe("scoreCandidate — role not found", () => {
  it("throws when the role file does not exist", async () => {
    mockFetchRepos.mockResolvedValue([]);
    await expect(
      scoreCandidate("user", "nonexistent-role", "token", rolesDir),
    ).rejects.toThrow("Role definition not found: nonexistent-role");
  });
});

describe("scoreCandidate — result shape", () => {
  it("returns all required fields", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ topics: ["react"], language: "TypeScript" })]);
    const result = await scoreCandidate("alice", "junior-frontend", "token", rolesDir);
    expect(result.candidate).toBe("alice");
    expect(result.role).toBe("junior-frontend");
    expect(typeof result.fit_score).toBe("number");
    expect(["Interview", "Pass"]).toContain(result.recommendation);
    expect(typeof result.breakdown.trajectory).toBe("number");
    expect(typeof result.breakdown.concept_match).toBe("number");
    expect(typeof result.breakdown.complexity).toBe("number");
    expect(Array.isArray(result.matched_concepts)).toBe(true);
    expect(Array.isArray(result.missing_concepts)).toBe(true);
    expect(typeof result.trajectory_summary).toBe("string");
  });

  it("fit_score is always in [0, 100]", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreCandidate("user", "junior-frontend", "token", rolesDir);
    expect(result.fit_score).toBeGreaterThanOrEqual(0);
    expect(result.fit_score).toBeLessThanOrEqual(100);
  });
});

describe("scoreCandidate — recommendation threshold", () => {
  it("recommends Interview when fit_score >= 50", async () => {
    // Provide repos that produce a high score: TypeScript + React + tests + CI
    mockFetchRepos.mockResolvedValue([
      makeRepo({
        language: "TypeScript",
        topics: ["react", "typescript", "vite", "redux"],
        readmeContent:
          "React app with hooks, useState, useEffect, TypeScript. REST API fetch. " +
          "Vite build tooling. CSS flexbox and grid layout. Git workflow with feature branches. " +
          "JavaScript ES6+ destructuring and async/await. " +
          "State management with Zustand. " +
          "![demo](screenshot.png) Live at https://myapp.vercel.app " + "x".repeat(500),
        description: "Feature branch git workflow with pull requests",
        hasTests: true,
        hasCi: true,
        size: 300,
        createdAt: "2024-06-01T00:00:00Z",
        pushedAt: "2025-05-01T00:00:00Z",
      }),
    ]);
    const result = await scoreCandidate("strong-candidate", "junior-frontend", "token", rolesDir);
    expect(result.recommendation).toBe("Interview");
    expect(result.fit_score).toBeGreaterThanOrEqual(50);
  });

  it("recommends Pass when fit_score < 50", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo()]);
    const result = await scoreCandidate("weak-candidate", "junior-frontend", "token", rolesDir);
    expect(result.recommendation).toBe("Pass");
    expect(result.fit_score).toBeLessThan(50);
  });
});

describe("scoreCandidate — scoring weights", () => {
  it("fit_score is the weighted average of the three breakdown scores", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ topics: ["react"], language: "TypeScript" }),
    ]);
    const result = await scoreCandidate("user", "junior-frontend", "token", rolesDir);
    const expected = Math.round(
      result.breakdown.trajectory * 0.45 +
      result.breakdown.concept_match * 0.35 +
      result.breakdown.complexity * 0.20,
    );
    expect(result.fit_score).toBe(expected);
  });

  it("empty repos produce fit_score 0", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreCandidate("user", "junior-frontend", "token", rolesDir);
    expect(result.fit_score).toBe(0);
  });
});

describe("scoreCandidate — junior-fullstack role", () => {
  it("accepts junior-fullstack as a valid role", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ topics: ["nodejs", "express"] })]);
    const result = await scoreCandidate("user", "junior-fullstack", "token", rolesDir);
    expect(result.role).toBe("junior-fullstack");
  });

  it("matched_concepts reflects fullstack signals", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({
        topics: ["nodejs", "express"],
        readmeContent: "Node.js REST API with PostgreSQL and Prisma ORM. Docker for local dev.",
        language: "TypeScript",
      }),
    ]);
    const result = await scoreCandidate("user", "junior-fullstack", "token", rolesDir);
    expect(result.matched_concepts.length).toBeGreaterThan(0);
  });
});

describe("scoreCandidate — passes token to fetchRepos", () => {
  it("calls fetchRepos with the supplied username and token", async () => {
    mockFetchRepos.mockResolvedValue([]);
    await scoreCandidate("myuser", "junior-frontend", "my-token", rolesDir);
    expect(mockFetchRepos).toHaveBeenCalledWith("myuser", "my-token");
  });
});

describe("scoreCandidate — top_repos and weak_repos", () => {
  it("returns empty arrays when there are no repos", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreCandidate("user", "junior-frontend", "token", rolesDir);
    expect(result.top_repos).toEqual([]);
    expect(result.weak_repos).toEqual([]);
  });

  it("top_repos and weak_repos are present in result shape", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ name: "repo-a", size: 500, hasTests: true, hasCi: true })]);
    const result = await scoreCandidate("user", "junior-frontend", "token", rolesDir);
    expect(Array.isArray(result.top_repos)).toBe(true);
    expect(Array.isArray(result.weak_repos)).toBe(true);
  });

  it("top_repos contains the highest-complexity repo", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ name: "strong", size: 500, hasTests: true, hasCi: true }),
      makeRepo({ name: "weak", size: 0 }),
      makeRepo({ name: "mid", size: 50 }),
      makeRepo({ name: "mid2", size: 50 }),
    ]);
    const result = await scoreCandidate("user", "junior-frontend", "token", rolesDir);
    expect(result.top_repos[0]!.name).toBe("strong");
  });

  it("weak_repos contains the lowest-complexity repo", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ name: "strong", size: 500, hasTests: true, hasCi: true }),
      makeRepo({ name: "weak", size: 0 }),
      makeRepo({ name: "mid", size: 50 }),
      makeRepo({ name: "mid2", size: 50 }),
    ]);
    const result = await scoreCandidate("user", "junior-frontend", "token", rolesDir);
    expect(result.weak_repos[0]!.name).toBe("weak");
  });

  it("repo_url uses the correct github URL format", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ name: "my-project" })]);
    const result = await scoreCandidate("alice", "junior-frontend", "token", rolesDir);
    expect(result.top_repos[0]!.repo_url).toBe("https://github.com/alice/my-project");
  });

  it("highlight URLs use the repo default branch and path", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({
        name: "proj",
        defaultBranch: "main",
        highlights: [{ signal: "ci", path: ".github/workflows" }],
      }),
    ]);
    const result = await scoreCandidate("bob", "junior-frontend", "token", rolesDir);
    const highlight = result.top_repos[0]!.highlights[0];
    expect(highlight).toBeDefined();
    expect(highlight!.signal).toBe("ci");
    expect(highlight!.url).toBe("https://github.com/bob/proj/tree/main/.github/workflows");
  });
});
