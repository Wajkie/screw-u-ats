import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchProfile, GitHubError } from "../fetchProfile.js";

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

describe("fetchProfile", () => {
  it("returns a mapped profile on success", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        login: "octocat",
        name: "The Octocat",
        bio: "A dev",
        public_repos: 12,
        created_at: "2020-01-15T00:00:00Z",
        followers: 42,
      }),
    );

    const profile = await fetchProfile("octocat", TOKEN);

    expect(profile.login).toBe("octocat");
    expect(profile.name).toBe("The Octocat");
    expect(profile.bio).toBe("A dev");
    expect(profile.publicRepos).toBe(12);
    expect(profile.accountCreatedAt).toBe("2020-01-15T00:00:00Z");
    expect(profile.followers).toBe(42);
  });

  it("handles null name and bio", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        login: "nobody",
        name: null,
        bio: null,
        public_repos: 0,
        created_at: "2021-01-01T00:00:00Z",
        followers: 0,
      }),
    );

    const profile = await fetchProfile("nobody", TOKEN);
    expect(profile.name).toBeNull();
    expect(profile.bio).toBeNull();
  });

  it("throws GitHubError with status 404 for unknown user", async () => {
    vi.stubGlobal("fetch", mockFetch(404, {}));

    await expect(fetchProfile("ghost-user", TOKEN)).rejects.toThrow(GitHubError);
    await expect(fetchProfile("ghost-user", TOKEN)).rejects.toMatchObject({ status: 404 });
  });

  it("throws GitHubError with status 403 on rate limit", async () => {
    vi.stubGlobal("fetch", mockFetch(403, {}));

    await expect(fetchProfile("octocat", TOKEN)).rejects.toMatchObject({ status: 403 });
  });

  it("throws GitHubError with status 429 on rate limit", async () => {
    vi.stubGlobal("fetch", mockFetch(429, {}));

    await expect(fetchProfile("octocat", TOKEN)).rejects.toMatchObject({ status: 429 });
  });

  it("sends the Authorization header", async () => {
    const spy = mockFetch(200, {
      login: "x",
      name: null,
      bio: null,
      public_repos: 0,
      created_at: "2020-01-01T00:00:00Z",
      followers: 0,
    });
    vi.stubGlobal("fetch", spy);

    await fetchProfile("x", "my-secret-token");

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer my-secret-token");
  });
});
