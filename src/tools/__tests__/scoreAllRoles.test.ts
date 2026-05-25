import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolve } from "path";

vi.mock("../../github/fetchRepos.js");

import { fetchRepos } from "../../github/fetchRepos.js";
import { scoreAllRoles, ALL_ROLES, TRACKS, TIERS } from "../scoreAllRoles.js";
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

describe("scoreAllRoles — result shape", () => {
  it("returns a flat roles array covering all available role files", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    expect(result.roles.length).toBeGreaterThan(0);
    for (const role of result.roles) {
      expect(ALL_ROLES).toContain(role.role);
    }
  });

  it("includes candidate, best_fit, chart, roles, and tracks fields", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    expect(result.candidate).toBe("alice");
    expect(ALL_ROLES).toContain(result.best_fit);
    expect(typeof result.chart).toBe("string");
    expect(result.chart.length).toBeGreaterThan(0);
    expect(Array.isArray(result.roles)).toBe(true);
    expect(Array.isArray(result.tracks)).toBe(true);
  });

  it("each role entry has the required fields", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ language: "TypeScript" })]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    for (const role of result.roles) {
      expect(typeof role.fit_score).toBe("number");
      expect(["Interview", "Pass"]).toContain(role.recommendation);
      expect(typeof role.breakdown.trajectory).toBe("number");
      expect(typeof role.breakdown.concept_match).toBe("number");
      expect(typeof role.breakdown.complexity).toBe("number");
      expect(Array.isArray(role.matched_concepts)).toBe(true);
      expect(Array.isArray(role.missing_concepts)).toBe(true);
    }
  });

  it("fit_score is always in [0, 100]", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo()]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    for (const role of result.roles) {
      expect(role.fit_score).toBeGreaterThanOrEqual(0);
      expect(role.fit_score).toBeLessThanOrEqual(100);
    }
  });
});

describe("scoreAllRoles — tracks grouping", () => {
  it("tracks contains one entry per track", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    const trackNames = result.tracks.map((g) => g.track);
    expect(trackNames).toContain("frontend");
    expect(trackNames).toContain("backend");
    expect(trackNames).toContain("fullstack");
    expect(trackNames).toContain("csharp");
  });

  it("each track group tiers are ordered junior → mid → senior", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    for (const group of result.tracks) {
      const tierOrder = group.tiers.map((t) => t.role.split("-")[0]);
      const expected = TIERS.filter((tier) =>
        group.tiers.some((t) => t.role.startsWith(tier)),
      );
      expect(tierOrder).toEqual(expected);
    }
  });

  it("tracks tiers are a subset of the flat roles array", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    const tracksRoles = result.tracks.flatMap((g) => g.tiers.map((t) => t.role));
    const flatRoles = result.roles.map((r) => r.role);
    expect(tracksRoles.sort()).toEqual(flatRoles.sort());
  });

  it("omits tracks with no available role files and returns empty roles array", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const emptyDir = resolve(__dirname, "../../../knowledge/nonexistent");
    const result = await scoreAllRoles("alice", "token", emptyDir);
    expect(result.roles).toHaveLength(0);
    for (const group of result.tracks) {
      expect(group.tiers).toHaveLength(0);
    }
    expect(result.chart).toContain("alice");
  });
});

describe("scoreAllRoles — best_fit selection", () => {
  it("best_fit points to the role with the highest fit_score", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    const best = result.roles.reduce((a, b) => (b.fit_score > a.fit_score ? b : a));
    expect(result.best_fit).toBe(best.role);
  });

  it("frontend signals push best_fit toward frontend", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({
        language: "TypeScript",
        topics: ["react", "typescript", "vite"],
        readmeContent:
          "React app with hooks useState useEffect TypeScript. " +
          "REST API fetch. Vite build tooling. CSS flexbox grid. " +
          "Git workflow feature branches. JavaScript ES6+ async/await. " +
          "State management Zustand. " + "x".repeat(400),
        hasTests: true,
        hasCi: true,
        size: 300,
      }),
    ]);
    const result = await scoreAllRoles("frontend-dev", "token", rolesDir);
    expect(result.best_fit).toContain("frontend");
  });

  it("C# signals push best_fit toward csharp", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({
        language: "C#",
        topics: ["aspnet", "dotnet", "csharp"],
        readmeContent:
          "ASP.NET Core REST API with Entity Framework Core PostgreSQL. " +
          "JWT authentication dependency injection xUnit unit tests. " +
          "LINQ generics interfaces async/await. " + "x".repeat(400),
        csprojDeps: ["Microsoft.AspNetCore", "EntityFrameworkCore", "xunit"],
        hasTests: true,
        hasCi: true,
        size: 300,
      }),
    ]);
    const result = await scoreAllRoles("csharp-dev", "token", rolesDir);
    expect(result.best_fit).toContain("csharp");
  });
});

describe("scoreAllRoles — chart output", () => {
  it("chart includes the candidate username", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("myuser", "token", rolesDir);
    expect(result.chart).toContain("myuser");
  });

  it("chart groups tiers under track headings", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ language: "TypeScript" })]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    expect(result.chart).toMatch(/Frontend/);
    expect(result.chart).toMatch(/Backend/);
    expect(result.chart).toMatch(/Junior/i);
    expect(result.chart).toMatch(/Mid/i);
  });

  it("chart includes bar characters", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ language: "TypeScript", topics: ["react"], hasTests: true, size: 200 }),
    ]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    expect(result.chart).toContain("█");
    expect(result.chart).toContain("░");
  });

  it("chart contains best fit marker and Best fit line", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await scoreAllRoles("alice", "token", rolesDir);
    expect(result.chart).toContain("← best fit");
    expect(result.chart).toMatch(/Best fit:/);
  });
});

describe("scoreAllRoles — fetchRepos called once", () => {
  it("fetches repos only once regardless of role count", async () => {
    mockFetchRepos.mockResolvedValue([]);
    await scoreAllRoles("alice", "my-token", rolesDir);
    expect(mockFetchRepos).toHaveBeenCalledTimes(1);
    expect(mockFetchRepos).toHaveBeenCalledWith("alice", "my-token");
  });
});
