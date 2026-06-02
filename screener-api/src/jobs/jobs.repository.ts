import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import type { AllRolesResult } from '../../../src/tools/scoreAllRoles.js';

export async function createJob(candidateId: string) {
  return db
    .insertInto('analysis_jobs')
    .values({
      id: nanoid(),
      candidate_id: candidateId,
      status: 'pending',
      error: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function setJobRunning(id: string) {
  await db
    .updateTable('analysis_jobs')
    .set({ status: 'running', started_at: new Date().toISOString() })
    .where('id', '=', id)
    .execute();
}

export async function setJobFailed(id: string, error: string) {
  await db
    .updateTable('analysis_jobs')
    .set({ status: 'failed', error, completed_at: new Date().toISOString() })
    .where('id', '=', id)
    .execute();
}

export async function setJobDone(id: string) {
  await db
    .updateTable('analysis_jobs')
    .set({ status: 'done', completed_at: new Date().toISOString() })
    .where('id', '=', id)
    .execute();
}

export async function insertReport(jobId: string, candidateId: string, result: AllRolesResult) {
  const best = result.roles.find((r) => r.role === result.best_fit);
  return db
    .insertInto('reports')
    .values({
      id: nanoid(),
      candidate_id: candidateId,
      job_id: jobId,
      best_fit: result.best_fit,
      fit_score: best?.fit_score ?? 0,
      data: JSON.stringify(result),
      created_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function findJobById(id: string) {
  const job = await db
    .selectFrom('analysis_jobs')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  if (!job) return undefined;

  const report =
    job.status === 'done'
      ? await db
          .selectFrom('reports')
          .select('id')
          .where('job_id', '=', id)
          .executeTakeFirst()
      : undefined;

  return { ...job, report_id: report?.id ?? null };
}
