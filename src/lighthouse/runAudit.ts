interface AuditRef {
  id: string;
  weight: number;
  group?: string;
}

interface Category {
  score: number | null;
  auditRefs: AuditRef[];
}

interface Audit {
  score: number | null;
  title: string;
}

interface PageSpeedResponse {
  lighthouseResult?: {
    categories?: {
      performance?: Category;
      accessibility?: Category;
      "best-practices"?: Category;
      seo?: Category;
    };
    audits?: Record<string, Audit>;
  };
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  best_practices: number;
  seo: number;
}

export interface UrlAuditResult {
  url: string;
  scores: LighthouseScores;
  wcag_violations: string[];
}

export interface LighthouseEnrichment {
  live_projects_found: number;
  audits: UrlAuditResult[];
}

function toScore(raw: number | null | undefined): number {
  if (raw == null) return 0;
  return Math.round(raw * 100);
}

async function auditUrl(url: string, apiKey: string): Promise<UrlAuditResult | null> {
  const params = new URLSearchParams({ url, strategy: "mobile" });
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("category", "best-practices");
  params.append("category", "seo");
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`,
    { signal: AbortSignal.timeout(30_000) },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as PageSpeedResponse;
  const cats = data.lighthouseResult?.categories;
  const audits = data.lighthouseResult?.audits ?? {};

  const a11yIds = new Set((cats?.accessibility?.auditRefs ?? []).map((r) => r.id));
  const wcagViolations = Object.entries(audits)
    .filter(([id, a]) => a11yIds.has(id) && a.score !== null && a.score < 1)
    .map(([, a]) => a.title);

  return {
    url,
    scores: {
      performance: toScore(cats?.performance?.score),
      accessibility: toScore(cats?.accessibility?.score),
      best_practices: toScore(cats?.["best-practices"]?.score),
      seo: toScore(cats?.seo?.score),
    },
    wcag_violations: wcagViolations,
  };
}

export async function runLighthouseAudits(
  urls: string[],
  apiKey: string,
): Promise<LighthouseEnrichment> {
  const capped = urls.slice(0, 3);
  const results = await Promise.all(
    capped.map((url) => auditUrl(url, apiKey).catch(() => null)),
  );
  const successful = results.filter((r): r is UrlAuditResult => r !== null);

  return {
    live_projects_found: capped.length,
    audits: successful,
  };
}
