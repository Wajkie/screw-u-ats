import { db } from '../db/client.js';
import type { AllRolesResult } from '../../../src/tools/scoreAllRoles.js';

export async function listReportsByCandidate(candidateId: string) {
  return db
    .selectFrom('reports')
    .select(['id', 'job_id', 'best_fit', 'fit_score', 'created_at'])
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
