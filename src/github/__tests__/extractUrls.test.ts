import { describe, it, expect } from "vitest";
import { extractLiveUrls } from "../extractUrls.js";
import type { GitHubRepo } from "../fetchRepos.js";

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "test-repo",
    language: null,
    createdAt: "2024-01-01T00:00:00Z",
    pushedAt: "2025-01-01T00:00:00Z",
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

describe("extractLiveUrls", () => {
  it("returns homepage URLs set on repos", () => {
    const repos = [makeRepo({ homepage: "https://wajkiedevelopment.se" })];
    expect(extractLiveUrls(repos)).toEqual(["https://wajkiedevelopment.se"]);
  });

  it("strips trailing slashes", () => {
    const repos = [makeRepo({ homepage: "https://wajkiedevelopment.se/" })];
    expect(extractLiveUrls(repos)).toEqual(["https://wajkiedevelopment.se"]);
  });

  it("deduplicates the same URL across multiple repos", () => {
    const repos = [
      makeRepo({ homepage: "https://wajkiedevelopment.se" }),
      makeRepo({ name: "other-repo", homepage: "https://wajkiedevelopment.se/" }),
    ];
    expect(extractLiveUrls(repos)).toHaveLength(1);
  });

  it("skips repos with no homepage", () => {
    const repos = [makeRepo({ homepage: null }), makeRepo({ homepage: "" })];
    expect(extractLiveUrls(repos)).toHaveLength(0);
  });

  it("skips non-http homepage values", () => {
    const repos = [makeRepo({ homepage: "github.com/user/repo" })];
    expect(extractLiveUrls(repos)).toHaveLength(0);
  });

  it("caps results at 5 URLs", () => {
    const repos = Array.from({ length: 8 }, (_, i) =>
      makeRepo({ name: `repo-${i}`, homepage: `https://project-${i}.example.com` }),
    );
    expect(extractLiveUrls(repos)).toHaveLength(5);
  });

  it("returns empty array when repos list is empty", () => {
    expect(extractLiveUrls([])).toHaveLength(0);
  });
});


