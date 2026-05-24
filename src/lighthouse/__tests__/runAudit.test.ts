import { describe, it, expect, vi, beforeEach } from "vitest";
import { runLighthouseAudits } from "../runAudit.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
});

function makePageSpeedResponse(overrides: {
  performance?: number;
  accessibility?: number;
  bestPractices?: number;
  seo?: number;
  a11yAuditRefs?: string[];
  failingAudits?: Record<string, string>;
} = {}) {
  const a11yRefs = overrides.a11yAuditRefs ?? ["color-contrast", "image-alt"];
  const allAudits: Record<string, { score: number | null; title: string }> = {};

  for (const id of a11yRefs) {
    const title = overrides.failingAudits?.[id] ?? `Audit: ${id}`;
    allAudits[id] = { score: id in (overrides.failingAudits ?? {}) ? 0 : 1, title };
  }

  return {
    lighthouseResult: {
      categories: {
        performance: { score: (overrides.performance ?? 90) / 100, auditRefs: [] },
        accessibility: {
          score: (overrides.accessibility ?? 85) / 100,
          auditRefs: a11yRefs.map((id) => ({ id, weight: 3 })),
        },
        "best-practices": { score: (overrides.bestPractices ?? 80) / 100, auditRefs: [] },
        seo: { score: (overrides.seo ?? 95) / 100, auditRefs: [] },
      },
      audits: allAudits,
    },
  };
}

describe("runLighthouseAudits", () => {
  it("returns empty enrichment when no URLs provided", async () => {
    const result = await runLighthouseAudits([], "");
    expect(result.live_projects_found).toBe(0);
    expect(result.audits).toHaveLength(0);
  });

  it("returns scores as 0–100 integers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makePageSpeedResponse({ performance: 72, accessibility: 91 }),
    });

    const result = await runLighthouseAudits(["https://myapp.vercel.app"], "");
    expect(result.audits[0]?.scores.performance).toBe(72);
    expect(result.audits[0]?.scores.accessibility).toBe(91);
  });

  it("reports WCAG violations from failing accessibility audits", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        makePageSpeedResponse({
          a11yAuditRefs: ["color-contrast", "image-alt"],
          failingAudits: {
            "color-contrast": "Background and foreground colors do not have sufficient contrast ratio.",
          },
        }),
    });

    const result = await runLighthouseAudits(["https://myapp.vercel.app"], "");
    expect(result.audits[0]?.wcag_violations).toContain(
      "Background and foreground colors do not have sufficient contrast ratio.",
    );
    expect(result.audits[0]?.wcag_violations).not.toContain("Audit: image-alt");
  });

  it("skips URLs that return a non-OK response", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    const result = await runLighthouseAudits(["https://myapp.vercel.app"], "");
    expect(result.live_projects_found).toBe(0);
    expect(result.audits).toHaveLength(0);
  });

  it("skips URLs where fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    const result = await runLighthouseAudits(["https://myapp.vercel.app"], "");
    expect(result.live_projects_found).toBe(0);
  });

  it("caps audits at 3 URLs even when more are provided", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makePageSpeedResponse(),
    });

    const urls = [
      "https://a.vercel.app",
      "https://b.vercel.app",
      "https://c.vercel.app",
      "https://d.vercel.app",
    ];
    const result = await runLighthouseAudits(urls, "");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.audits.length).toBeLessThanOrEqual(3);
  });

  it("includes the api key in the request when provided", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makePageSpeedResponse(),
    });

    await runLighthouseAudits(["https://myapp.vercel.app"], "my-api-key");
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("key=my-api-key");
  });

  it("does not include key param when apiKey is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makePageSpeedResponse(),
    });

    await runLighthouseAudits(["https://myapp.vercel.app"], "");
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("key=");
  });
});
