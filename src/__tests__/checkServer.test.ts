import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("../tools/scoreAllRoles.js");
vi.mock("../logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { createCheckApp } from "../checkServer.js";
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
