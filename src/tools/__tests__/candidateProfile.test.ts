import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../github/fetchRepos.js");

import { fetchRepos } from "../../github/fetchRepos.js";
import { candidateProfile } from "../candidateProfile.js";
import type { GitHubRepo } from "../../github/fetchRepos.js";

const mockFetchRepos = vi.mocked(fetchRepos);

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

describe("candidateProfile — result shape", () => {
  it("returns all required fields", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ language: "TypeScript" })]);
    const result = await candidateProfile("alice", "token");
    expect(result.candidate).toBe("alice");
    expect(typeof result.repo_count).toBe("number");
    expect(Array.isArray(result.top_languages)).toBe(true);
    expect(Array.isArray(result.top_repos)).toBe(true);
    expect(Array.isArray(result.suggested_roles)).toBe(true);
    expect(typeof result.avg_complexity).toBe("number");
    expect(typeof result.trajectory_summary).toBe("string");
    expect(result.skill_map).toBeDefined();
  });

  it("returns empty arrays and zeroes for a user with no repos", async () => {
    mockFetchRepos.mockResolvedValue([]);
    const result = await candidateProfile("nobody", "token");
    expect(result.repo_count).toBe(0);
    expect(result.top_languages).toEqual([]);
    expect(result.avg_complexity).toBe(0);
    expect(result.active_since).toBeNull();
    expect(result.last_active).toBeNull();
  });
});

describe("candidateProfile — repo_count", () => {
  it("equals the total number of repos returned by fetchRepos", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ name: "a" }), makeRepo({ name: "b" }), makeRepo({ name: "c" })]);
    const result = await candidateProfile("user", "token");
    expect(result.repo_count).toBe(3);
  });
});

describe("candidateProfile — top_languages", () => {
  it("returns most-used language first", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ language: "TypeScript" }),
      makeRepo({ language: "TypeScript" }),
      makeRepo({ language: "JavaScript" }),
    ]);
    const result = await candidateProfile("user", "token");
    expect(result.top_languages[0]).toBe("TypeScript");
  });

  it("caps at 3 languages", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ language: "TypeScript" }),
      makeRepo({ language: "JavaScript" }),
      makeRepo({ language: "Python" }),
      makeRepo({ language: "Go" }),
    ]);
    const result = await candidateProfile("user", "token");
    expect(result.top_languages.length).toBeLessThanOrEqual(3);
  });

  it("omits repos with null language", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ language: null }), makeRepo({ language: "Go" })]);
    const result = await candidateProfile("user", "token");
    expect(result.top_languages).toEqual(["Go"]);
  });
});

describe("candidateProfile — active_since and last_active", () => {
  it("active_since is the oldest createdAt", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ createdAt: "2023-03-01T00:00:00Z" }),
      makeRepo({ createdAt: "2022-01-01T00:00:00Z" }),
      makeRepo({ createdAt: "2024-06-01T00:00:00Z" }),
    ]);
    const result = await candidateProfile("user", "token");
    expect(result.active_since).toBe("2022-01-01T00:00:00Z");
  });

  it("last_active is the most recent pushedAt", async () => {
    mockFetchRepos.mockResolvedValue([
      makeRepo({ pushedAt: "2025-01-01T00:00:00Z" }),
      makeRepo({ pushedAt: "2025-05-15T00:00:00Z" }),
      makeRepo({ pushedAt: "2024-12-01T00:00:00Z" }),
    ]);
    const result = await candidateProfile("user", "token");
    expect(result.last_active).toBe("2025-05-15T00:00:00Z");
  });
});

describe("candidateProfile — suggested_roles", () => {
  it("suggests at least one role", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ language: "TypeScript", topics: ["react"] })]);
    const result = await candidateProfile("user", "token");
    expect(result.suggested_roles.length).toBeGreaterThan(0);
  });

  it("suggested roles are valid role strings", async () => {
    const validRoles = new Set([
      "junior-frontend", "junior-fullstack", "junior-backend", "junior-csharp",
      "mid-frontend", "mid-fullstack", "mid-backend", "mid-csharp",
      "senior-frontend", "senior-fullstack", "senior-backend", "senior-csharp",
    ]);
    mockFetchRepos.mockResolvedValue([makeRepo({ language: "TypeScript" })]);
    const result = await candidateProfile("user", "token");
    for (const role of result.suggested_roles) {
      expect(validRoles.has(role)).toBe(true);
    }
  });

  it("suggests a csharp role when C# files are present", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo({ hasCsFiles: true, csprojDeps: ["Microsoft.AspNetCore.App"] })]);
    const result = await candidateProfile("user", "token");
    expect(result.suggested_roles.some((r) => r.endsWith("-csharp"))).toBe(true);
  });
});

describe("candidateProfile — passes token to fetchRepos", () => {
  it("calls fetchRepos with the supplied username and token", async () => {
    mockFetchRepos.mockResolvedValue([]);
    await candidateProfile("myuser", "my-token");
    expect(mockFetchRepos).toHaveBeenCalledWith("myuser", "my-token");
  });
});

describe("candidateProfile — graduation_date", () => {
  it("accepts graduation_date without throwing", async () => {
    mockFetchRepos.mockResolvedValue([makeRepo()]);
    await expect(
      candidateProfile("user", "token", new Date("2025-06-01")),
    ).resolves.not.toThrow();
  });
});
