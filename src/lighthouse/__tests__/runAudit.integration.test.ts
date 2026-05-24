import { describe, it, expect, beforeAll, vi } from "vitest";
import { runLighthouseAudits } from "../runAudit.js";

beforeAll(() => {
  vi.unstubAllGlobals();
});

// Real network test — hits the PageSpeed Insights API against a live site.
// Skipped in CI unless PAGESPEED_INTEGRATION=true is set.
const runIntegration = process.env["PAGESPEED_INTEGRATION"] === "true";

describe.skipIf(!runIntegration)("runLighthouseAudits — integration", () => {
  it(
    "audits wajkiedevelopment.se and returns valid Lighthouse scores",
    async () => {
      const result = await runLighthouseAudits(
        ["https://wajkiedevelopment.se"],
        process.env["PAGESPEED_API_KEY"] ?? "",
      );

      expect(result.live_projects_found).toBe(1);
      expect(result.audits).toHaveLength(1);

      const audit = result.audits[0]!;
      expect(audit.url).toBe("https://wajkiedevelopment.se");

      for (const key of ["performance", "accessibility", "best_practices", "seo"] as const) {
        expect(audit.scores[key]).toBeGreaterThanOrEqual(0);
        expect(audit.scores[key]).toBeLessThanOrEqual(100);
      }

      expect(Array.isArray(audit.wcag_violations)).toBe(true);
    },
    60_000,
  );
});
