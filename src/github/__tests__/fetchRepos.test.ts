import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRepos, GitHubRepo } from "../fetchRepos.js";
import { GitHubError } from "../fetchProfile.js";

const TOKEN = "test-token";

function makeRawRepo(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    name: "my-repo",
    language: "TypeScript",
    created_at: "2023-01-01T00:00:00Z",
    pushed_at: "2024-06-01T00:00:00Z",
    topics: ["react", "typescript"],
    description: "A demo project",
    stargazers_count: 3,
    size: 512,
    default_branch: "main",
    ...overrides,
  };
}

function rootContents(names: string[], types: ("file" | "dir")[] = []) {
  return names.map((name, i) => ({ name, type: types[i] ?? "file" }));
}

function b64(text: string) {
  return Buffer.from(text).toString("base64");
}

beforeEach(() => {
  vi.restoreAllMocks();
});

function stubFetch(responses: Array<{ status: number; body: unknown }>) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => {
      const r = responses[call++] ?? responses[responses.length - 1]!;
      return Promise.resolve({
        ok: r.status >= 200 && r.status < 300,
        status: r.status,
        json: () => Promise.resolve(r.body),
      });
    }),
  );
}

describe("fetchRepos", () => {
  it("maps raw repo fields to camelCase shape", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: rootContents([".github", "src"], ["dir", "dir"]) },
      { status: 200, body: { content: b64("# Readme"), encoding: "base64" } },
    ]);

    const repos = await fetchRepos("octocat", TOKEN);
    const repo = repos[0] as GitHubRepo;

    expect(repo.name).toBe("my-repo");
    expect(repo.language).toBe("TypeScript");
    expect(repo.createdAt).toBe("2023-01-01T00:00:00Z");
    expect(repo.pushedAt).toBe("2024-06-01T00:00:00Z");
    expect(repo.topics).toEqual(["react", "typescript"]);
    expect(repo.description).toBe("A demo project");
    expect(repo.stargazersCount).toBe(3);
    expect(repo.size).toBe(512);
    expect(repo.defaultBranch).toBe("main");
  });

  it("detects CI from .github directory", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: rootContents([".github", "src"], ["dir", "dir"]) },
      { status: 404, body: {} },
    ]);

    const [repo] = await fetchRepos("octocat", TOKEN);
    expect(repo!.hasCi).toBe(true);
  });

  it("sets hasCi false when .github dir is absent", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: rootContents(["src", "index.ts"], ["dir", "file"]) },
      { status: 404, body: {} },
    ]);

    const [repo] = await fetchRepos("octocat", TOKEN);
    expect(repo!.hasCi).toBe(false);
  });

  it("detects tests from __tests__ directory", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: rootContents(["__tests__", "src"], ["dir", "dir"]) },
      { status: 404, body: {} },
    ]);

    const [repo] = await fetchRepos("octocat", TOKEN);
    expect(repo!.hasTests).toBe(true);
  });

  it("detects tests from .test.ts file in root", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: rootContents(["app.test.ts"], ["file"]) },
      { status: 404, body: {} },
    ]);

    const [repo] = await fetchRepos("octocat", TOKEN);
    expect(repo!.hasTests).toBe(true);
  });

  it("sets hasTests false when no test indicators exist", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: rootContents(["src", "README.md"], ["dir", "file"]) },
      { status: 404, body: {} },
    ]);

    const [repo] = await fetchRepos("octocat", TOKEN);
    expect(repo!.hasTests).toBe(false);
  });

  it("returns decoded readme content", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: [] },
      { status: 200, body: { content: b64("# My Project\n\nA cool thing."), encoding: "base64" } },
    ]);

    const [repo] = await fetchRepos("octocat", TOKEN);
    expect(repo!.readmeContent).toBe("# My Project\n\nA cool thing.");
  });

  it("sets readmeContent null when readme endpoint returns 404", async () => {
    stubFetch([
      { status: 200, body: [makeRawRepo()] },
      { status: 200, body: [] },
      { status: 404, body: {} },
    ]);

    const [repo] = await fetchRepos("octocat", TOKEN);
    expect(repo!.readmeContent).toBeNull();
  });

  it("returns empty array when user has no repos", async () => {
    stubFetch([{ status: 200, body: [] }]);

    const repos = await fetchRepos("octocat", TOKEN);
    expect(repos).toEqual([]);
  });

  it("throws GitHubError 404 for unknown user", async () => {
    stubFetch([{ status: 404, body: {} }]);

    await expect(fetchRepos("ghost-user", TOKEN)).rejects.toMatchObject({ status: 404 });
  });

  it("throws GitHubError 429 on rate limit", async () => {
    stubFetch([{ status: 429, body: {} }]);

    await expect(fetchRepos("octocat", TOKEN)).rejects.toThrow(GitHubError);
  });
});
