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
