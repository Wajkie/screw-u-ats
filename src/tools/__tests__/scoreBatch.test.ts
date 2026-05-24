import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

vi.mock("../scoreCandidate.js");

import { scoreCandidate } from "../scoreCandidate.js";
import { scoreBatch } from "../scoreBatch.js";
import type { CandidateScoreResult } from "../scoreCandidate.js";

beforeAll(() => {
  vi.unstubAllGlobals();
});

const mockScoreCandidate = vi.mocked(scoreCandidate);

function makeResult(candidate: string, fit_score: number): CandidateScoreResult {
  return {
    candidate,
    role: "junior-frontend",
    fit_score,
    recommendation: fit_score >= 50 ? "Interview" : "Pass",
    breakdown: { trajectory: fit_score, concept_match: fit_score, complexity: fit_score },
    matched_concepts: [],
    missing_concepts: [],
    trajectory_summary: "flat",
    top_repos: [],
    weak_repos: [],
  };
}

beforeEach(() => {
  mockScoreCandidate.mockReset();
});

describe("scoreBatch — result shape", () => {
  it("returns role, candidates array, and chart string", async () => {
    mockScoreCandidate
      .mockResolvedValueOnce(makeResult("alice", 70))
      .mockResolvedValueOnce(makeResult("bob", 50));
    const result = await scoreBatch(["alice", "bob"], "junior-frontend", "token", "/roles");
    expect(result.role).toBe("junior-frontend");
    expect(Array.isArray(result.candidates)).toBe(true);
    expect(typeof result.chart).toBe("string");
    expect(result.chart.length).toBeGreaterThan(0);
  });

  it("returns one entry per username", async () => {
    mockScoreCandidate
      .mockResolvedValueOnce(makeResult("alice", 60))
      .mockResolvedValueOnce(makeResult("bob", 40))
      .mockResolvedValueOnce(makeResult("carol", 80));
    const result = await scoreBatch(["alice", "bob", "carol"], "junior-frontend", "token", "/roles");
    expect(result.candidates).toHaveLength(3);
  });

  it("single username still works", async () => {
    mockScoreCandidate.mockResolvedValueOnce(makeResult("alice", 55));
    const result = await scoreBatch(["alice"], "junior-frontend", "token", "/roles");
    expect(result.candidates).toHaveLength(1);
  });
});

describe("scoreBatch — sort order", () => {
  it("candidates are sorted by fit_score descending", async () => {
    mockScoreCandidate
      .mockResolvedValueOnce(makeResult("strong", 85))
      .mockResolvedValueOnce(makeResult("weak", 20))
      .mockResolvedValueOnce(makeResult("mid", 55));

    const result = await scoreBatch(["strong", "weak", "mid"], "junior-frontend", "token", "/roles");

    for (let i = 0; i < result.candidates.length - 1; i++) {
      expect(result.candidates[i]!.fit_score).toBeGreaterThanOrEqual(result.candidates[i + 1]!.fit_score);
    }
  });

  it("candidate with highest fit_score is first", async () => {
    mockScoreCandidate
      .mockResolvedValueOnce(makeResult("weak", 20))
      .mockResolvedValueOnce(makeResult("strong", 90));

    const result = await scoreBatch(["weak", "strong"], "junior-frontend", "token", "/roles");
    expect(result.candidates[0]!.candidate).toBe("strong");
  });
});

describe("scoreBatch — chart output", () => {
  it("chart contains all usernames", async () => {
    mockScoreCandidate
      .mockResolvedValueOnce(makeResult("alice", 70))
      .mockResolvedValueOnce(makeResult("bob", 40));
    const result = await scoreBatch(["alice", "bob"], "junior-frontend", "token", "/roles");
    expect(result.chart).toContain("alice");
    expect(result.chart).toContain("bob");
  });

  it("chart contains rank markers", async () => {
    mockScoreCandidate
      .mockResolvedValueOnce(makeResult("alice", 70))
      .mockResolvedValueOnce(makeResult("bob", 40));
    const result = await scoreBatch(["alice", "bob"], "junior-frontend", "token", "/roles");
    expect(result.chart).toContain("#1");
    expect(result.chart).toContain("#2");
  });

  it("chart contains bar characters", async () => {
    mockScoreCandidate.mockResolvedValueOnce(makeResult("alice", 65));
    const result = await scoreBatch(["alice"], "junior-frontend", "token", "/roles");
    expect(result.chart).toMatch(/[█░]/);
  });

  it("chart header includes role name", async () => {
    mockScoreCandidate.mockResolvedValueOnce(makeResult("alice", 50));
    const result = await scoreBatch(["alice"], "junior-backend", "token", "/roles");
    expect(result.chart).toContain("junior-backend");
  });
});
