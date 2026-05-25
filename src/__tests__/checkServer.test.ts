import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("../tools/scoreAllRoles.js");
vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { createCheckApp, createRateLimiter } from "../checkServer.js";
import { scoreAllRoles } from "../tools/scoreAllRoles.js";
import type { AllRolesResult } from "../tools/scoreAllRoles.js";

const mockScoreAllRoles = vi.mocked(scoreAllRoles);

const fakeResult: AllRolesResult = {
  candidate: "testuser",
  best_fit: "junior-frontend",
  chart: "Role Fit — github.com/testuser\n─────\nBest fit: Junior Frontend Engineer (55%)",
  roles: [],
  tracks: [],
};

describe("createCheckApp", () => {
  beforeAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mockScoreAllRoles.mockReset();
  });

  it("GET /check/:githubName returns 200 with scoreAllRoles result", async () => {
    mockScoreAllRoles.mockResolvedValueOnce(fakeResult);
    const app = createCheckApp("fake-token");
    const res = await app.request("/check/testuser");
    expect(res.status).toBe(200);
    const data = await res.json() as AllRolesResult;
    expect(data.candidate).toBe("testuser");
    expect(data.best_fit).toBe("junior-frontend");
  });

  it("passes graduation_date query param to scoreAllRoles", async () => {
    mockScoreAllRoles.mockResolvedValueOnce(fakeResult);
    const app = createCheckApp("fake-token");
    await app.request("/check/testuser?graduation_date=2024-06-01");
    const [, , , gradDate] = mockScoreAllRoles.mock.calls[0]!;
    expect(gradDate).toBeInstanceOf(Date);
    expect((gradDate as Date).getFullYear()).toBe(2024);
  });

  it("returns 400 for invalid GitHub username", async () => {
    const app = createCheckApp("fake-token");
    const res = await app.request("/check/-invalid");
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("Invalid GitHub username");
  });

  it("returns 400 for invalid graduation_date", async () => {
    const app = createCheckApp("fake-token");
    const res = await app.request("/check/testuser?graduation_date=not-a-date");
    expect(res.status).toBe(400);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("graduation_date");
  });

  it("returns 500 when scoreAllRoles throws", async () => {
    mockScoreAllRoles.mockRejectedValueOnce(new Error("GitHub API rate limited"));
    const app = createCheckApp("fake-token");
    const res = await app.request("/check/testuser");
    expect(res.status).toBe(500);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("GitHub API rate limited");
  });

  it("sets CORS headers on response", async () => {
    mockScoreAllRoles.mockResolvedValueOnce(fakeResult);
    const app = createCheckApp("fake-token");
    const res = await app.request("/check/testuser", {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("passes null for graduation_date when not provided", async () => {
    mockScoreAllRoles.mockResolvedValueOnce(fakeResult);
    const app = createCheckApp("fake-token");
    await app.request("/check/testuser");
    const [, , , gradDate] = mockScoreAllRoles.mock.calls[0]!;
    expect(gradDate).toBeNull();
  });
});

describe("createRateLimiter", () => {
  it("sets X-RateLimit-* headers on successful requests", async () => {
    mockScoreAllRoles.mockResolvedValue(fakeResult);
    const app = createCheckApp("fake-token", 5, 60_000);
    const res = await app.request("/check/testuser", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-ratelimit-limit")).toBe("5");
    expect(res.headers.get("x-ratelimit-remaining")).toBe("4");
  });

  it("returns 429 after limit is exceeded", async () => {
    mockScoreAllRoles.mockResolvedValue(fakeResult);
    const app = createCheckApp("fake-token", 2, 60_000);
    const ip = { headers: { "x-forwarded-for": "10.0.0.1" } };
    await app.request("/check/testuser", ip);
    await app.request("/check/testuser", ip);
    const res = await app.request("/check/testuser", ip);
    expect(res.status).toBe(429);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("Rate limit exceeded");
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("counts IPs independently", async () => {
    mockScoreAllRoles.mockResolvedValue(fakeResult);
    const app = createCheckApp("fake-token", 1, 60_000);
    await app.request("/check/testuser", { headers: { "x-forwarded-for": "11.0.0.1" } });
    // First request from a different IP should still be allowed
    const res = await app.request("/check/testuser", { headers: { "x-forwarded-for": "11.0.0.2" } });
    expect(res.status).toBe(200);
  });

  it("resets the counter after the window expires", async () => {
    mockScoreAllRoles.mockResolvedValue(fakeResult);
    // 1-request limit with a 1 ms window — window expires immediately
    const app = createCheckApp("fake-token", 1, 1);
    const ip = { headers: { "x-forwarded-for": "12.0.0.1" } };
    await app.request("/check/testuser", ip);
    await new Promise((r) => setTimeout(r, 10));
    const res = await app.request("/check/testuser", ip);
    expect(res.status).toBe(200);
  });

  it("uses X-Forwarded-For first IP when multiple are present", async () => {
    mockScoreAllRoles.mockResolvedValue(fakeResult);
    const app = createCheckApp("fake-token", 1, 60_000);
    // Exhaust quota for the first IP in the list
    await app.request("/check/testuser", { headers: { "x-forwarded-for": "13.0.0.1, 99.99.99.99" } });
    const res = await app.request("/check/testuser", { headers: { "x-forwarded-for": "13.0.0.1, 99.99.99.99" } });
    expect(res.status).toBe(429);
  });
});
