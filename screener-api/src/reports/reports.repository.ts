import { db } from '../db/client.js';
import type { AllRolesResult } from '../../../src/tools/scoreAllRoles.js';

export async function listReportsByCandidate(candidateId: string) {
  return db
    .selectFrom('reports')
    .select(['id', 'job_id', 'best_fit', 'fit_score', 'recommendation', 'created_at'])
    .where('candidate_id', '=', candidateId)
    .orderBy('created_at', 'desc')
    .execute();
}

export async function findReportById(id: string) {
  const row = await db
    .selectFrom('reports')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!row) return undefined;
  return { ...row, data: JSON.parse(row.data) as AllRolesResult };
}

export async function listLatestReportsAllCandidates() {
  const rows = await db
    .selectFrom('reports as r')
    .innerJoin('candidates as c', 'c.id', 'r.candidate_id')
    .select([
      'r.id', 'r.candidate_id', 'r.created_at', 'r.data',
      'c.github_username', 'c.display_name',
    ])
    .orderBy('r.created_at', 'desc')
    .execute();

  const seen = new Set<string>();
  return rows.filter(row => {
    if (seen.has(row.candidate_id)) return false;
    seen.add(row.candidate_id);
    return true;
  });
}

export async function fitHistoryByCandidate(candidateId: string) {
  return db
    .selectFrom('reports')
    .select(['created_at', 'fit_score', 'best_fit'])
    .where('candidate_id', '=', candidateId)
    .orderBy('created_at', 'asc')
    .execute();
}
