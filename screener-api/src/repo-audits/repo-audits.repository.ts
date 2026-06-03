import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import type { UrlAuditResult } from '../../../src/lighthouse/runAudit.js';

export async function listRepoAuditsByCandidate(candidateId: string) {
  const rows = await db
    .selectFrom('repo_audits')
    .select(['repo_name', 'url', 'accessibility_score', 'performance_score', 'best_practices_score', 'seo_score', 'wcag_violations', 'audited_at'])
    .where('candidate_id', '=', candidateId)
    .orderBy('accessibility_score', 'desc')
    .execute();

  return rows.map((r) => ({ ...r, wcag_violations: JSON.parse(r.wcag_violations) as unknown[] }));
}

export async function insertRepoAudits(candidateId: string, audits: UrlAuditResult[]): Promise<void> {
  if (audits.length === 0) return;

  const now = new Date().toISOString();

  for (const audit of audits) {
    await db
      .insertInto('repo_audits')
      .values({
        id: nanoid(),
        candidate_id: candidateId,
        repo_name: audit.repo_name,
        url: audit.url,
        accessibility_score: audit.scores.accessibility,
        performance_score: audit.scores.performance,
        best_practices_score: audit.scores.best_practices,
        seo_score: audit.scores.seo,
        wcag_violations: JSON.stringify(audit.wcag_violations),
        audited_at: now,
      })
      .onConflict((oc) =>
        oc.columns(['candidate_id', 'url']).doUpdateSet({
          repo_name: audit.repo_name,
          accessibility_score: audit.scores.accessibility,
          performance_score: audit.scores.performance,
          best_practices_score: audit.scores.best_practices,
          seo_score: audit.scores.seo,
          wcag_violations: JSON.stringify(audit.wcag_violations),
          audited_at: now,
        }),
      )
      .execute();
  }
}
