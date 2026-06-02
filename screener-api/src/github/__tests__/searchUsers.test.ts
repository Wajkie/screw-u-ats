import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchGitHubUsers } from "../searchUsers.js";
import { GitHubError } from "../../../../src/github/fetchProfile.js";

const TOKEN = "test-token";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("searchGitHubUsers", () => {
  it("returns logins from search results", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        items: [{ login: "alice" }, { login: "bob" }, { login: "charlie" }],
      }),
    );

    const logins = await searchGitHubUsers(["react", "typescript"], TOKEN);

    expect(logins).toEqual(["alice", "bob", "charlie"]);
  });

  it("includes keywords in the query string", async () => {
    const spy = mockFetch(200, { items: [{ login: "alice" }] });
    vi.stubGlobal("fetch", spy);

    await searchGitHubUsers(["react", "typescript"], TOKEN);

    const [url] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("react");
    expect(url).toContain("typescript");
  });

  it("sends the Authorization header", async () => {
    const spy = mockFetch(200, { items: [] });
    vi.stubGlobal("fetch", spy);

    await searchGitHubUsers(["node"], "my-secret-token");

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer my-secret-token");
  });

  it("caps results at maxResults", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        items: [{ login: "a" }, { login: "b" }, { login: "c" }],
      }),
    );

    const logins = await searchGitHubUsers(["go"], TOKEN, 5);

    const [url] = (vi.mocked(fetch) as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain("per_page=5");
    expect(logins).toHaveLength(3);
  });

  it("returns empty array when no results", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { items: [] }));

    const logins = await searchGitHubUsers(["obscure-xyz-lang"], TOKEN);

    expect(logins).toEqual([]);
  });

  it("throws GitHubError on 403", async () => {
    vi.stubGlobal("fetch", mockFetch(403, {}));

    await expect(searchGitHubUsers(["react"], TOKEN)).rejects.toThrow(GitHubError);
    await expect(searchGitHubUsers(["react"], TOKEN)).rejects.toMatchObject({ status: 403 });
  });

  it("throws GitHubError on 429", async () => {
    vi.stubGlobal("fetch", mockFetch(429, {}));

    await expect(searchGitHubUsers(["react"], TOKEN)).rejects.toMatchObject({ status: 429 });
  });

  it("throws GitHubError on unexpected error status", async () => {
    vi.stubGlobal("fetch", mockFetch(500, {}));

    await expect(searchGitHubUsers(["react"], TOKEN)).rejects.toThrow(GitHubError);
  });
});
