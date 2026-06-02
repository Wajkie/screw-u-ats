import { nanoid } from 'nanoid';
import { db } from '../db/client.js';

export async function createSourcingJob(openingId: string) {
  return db
    .insertInto('sourcing_jobs')
    .values({
      id: nanoid(),
      opening_id: openingId,
      status: 'pending',
      error: null,
      usernames_found: 0,
      usernames_scored: 0,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function setSourcingJobRunning(id: string) {
  await db
    .updateTable('sourcing_jobs')
    .set({ status: 'running', started_at: new Date().toISOString() })
    .where('id', '=', id)
    .execute();
}

export async function setSourcingJobFound(id: string, count: number) {
  await db
    .updateTable('sourcing_jobs')
    .set({ usernames_found: count })
    .where('id', '=', id)
    .execute();
}

export async function setSourcingJobScored(id: string, count: number) {
  await db
    .updateTable('sourcing_jobs')
    .set({ usernames_scored: count })
    .where('id', '=', id)
    .execute();
}

export async function setSourcingJobDone(id: string) {
  await db
    .updateTable('sourcing_jobs')
    .set({ status: 'done', completed_at: new Date().toISOString() })
    .where('id', '=', id)
    .execute();
}

export async function setSourcingJobFailed(id: string, error: string) {
  await db
    .updateTable('sourcing_jobs')
    .set({ status: 'failed', error, completed_at: new Date().toISOString() })
    .where('id', '=', id)
    .execute();
}

export async function findSourcingJobById(id: string) {
  return db.selectFrom('sourcing_jobs').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function listCandidatesByOpening(openingId: string) {
  const rows = await db
    .selectFrom('reports as r')
    .innerJoin('candidates as c', 'c.id', 'r.candidate_id')
    .select([
      'c.id', 'c.github_username', 'c.display_name', 'c.created_at',
      'r.id as report_id', 'r.best_fit', 'r.fit_score', 'r.created_at as scored_at',
    ])
    .where('c.sourced_from_opening_id', '=', openingId)
    .orderBy('r.created_at', 'desc')
    .execute();

  // keep only the latest report per candidate
  const seen = new Set<string>();
  return rows
    .filter(row => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0));
}
