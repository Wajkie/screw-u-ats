import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import type { CreateCandidateInput, UpdateCandidateInput } from './candidates.schemas.js';

export type { CreateCandidateInput, UpdateCandidateInput };

export interface LatestReportSummary {
  id: string;
  best_fit: string;
  fit_score: number;
  created_at: string;
}

export async function createCandidate(input: CreateCandidateInput) {
  const now = new Date().toISOString();
  return db
    .insertInto('candidates')
    .values({
      id: nanoid(),
      github_username: input.github_username,
      display_name: input.display_name ?? null,
      graduation_date: input.graduation_date ?? null,
      notes: input.notes ?? null,
      location: input.location ?? null,
      work_type_preference: input.work_type_preference ?? null,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function listCandidates() {
  const candidates = await db
    .selectFrom('candidates')
    .selectAll()
    .orderBy('created_at', 'desc')
    .execute();

  const reports = await db
    .selectFrom('reports')
    .select(['candidate_id', 'id', 'best_fit', 'fit_score', 'created_at'])
    .execute();

  const latestByCandidate = new Map<string, (typeof reports)[0]>();
  for (const r of reports) {
    const existing = latestByCandidate.get(r.candidate_id);
    if (!existing || r.created_at > existing.created_at) latestByCandidate.set(r.candidate_id, r);
  }

  return candidates.map((c) => {
    const lr = latestByCandidate.get(c.id);
    return {
      ...c,
      latest_report: lr
        ? { id: lr.id, best_fit: lr.best_fit, fit_score: lr.fit_score, created_at: lr.created_at }
        : null,
    };
  });
}

export async function findCandidateById(id: string) {
  return db.selectFrom('candidates').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function getLatestReport(candidateId: string): Promise<LatestReportSummary | undefined> {
  return db
    .selectFrom('reports')
    .select(['id', 'best_fit', 'fit_score', 'created_at'])
    .where('candidate_id', '=', candidateId)
    .orderBy('created_at', 'desc')
    .limit(1)
    .executeTakeFirst();
}

export async function updateCandidate(id: string, input: UpdateCandidateInput) {
  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if ('display_name' in input) patch.display_name = input.display_name ?? null;
  if ('graduation_date' in input) patch.graduation_date = input.graduation_date ?? null;
  if ('notes' in input) patch.notes = input.notes ?? null;
  if ('location' in input) patch.location = input.location ?? null;
  if ('work_type_preference' in input) patch.work_type_preference = input.work_type_preference ?? null;

  return db.updateTable('candidates').set(patch).where('id', '=', id).returningAll().executeTakeFirst();
}

export async function deleteCandidate(id: string): Promise<boolean> {
  const existing = await db.selectFrom('candidates').select('id').where('id', '=', id).executeTakeFirst();
  if (!existing) return false;

  // Cascade manually — FK constraints don't declare ON DELETE CASCADE in the schema.
  await db.deleteFrom('reports').where('candidate_id', '=', id).execute();
  await db.deleteFrom('analysis_jobs').where('candidate_id', '=', id).execute();
  await db.deleteFrom('candidates').where('id', '=', id).execute();
  return true;
}
