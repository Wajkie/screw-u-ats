import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import { searchGitHubUsers } from '../github/searchUsers.js';
import { parseRoleDefinition } from '../../../src/scoring/conceptMatch.js';
import { findOpeningById } from '../openings/openings.repository.js';
import { createJob } from '../jobs/jobs.repository.js';
import { enqueueJob } from '../jobs/jobs.runner.js';
import {
  createSourcingJob,
  setSourcingJobRunning,
  setSourcingJobFound,
  setSourcingJobScored,
  setSourcingJobDone,
  setSourcingJobFailed,
} from './sourcing.repository.js';

export type SourcingEvent = {
  status: 'running' | 'done' | 'failed';
  usernames_found?: number;
  usernames_scored?: number;
  error?: string;
};

export const sourcingEmitters = new Map<string, Set<(event: SourcingEvent) => void>>();

function notify(sourcingJobId: string, event: SourcingEvent): void {
  const emitters = sourcingEmitters.get(sourcingJobId);
  if (!emitters) return;
  for (const emit of emitters) emit(event);
  if (event.status === 'done' || event.status === 'failed') {
    sourcingEmitters.delete(sourcingJobId);
  }
}

async function upsertCandidateSourced(username: string, openingId: string) {
  const existing = await db
    .selectFrom('candidates')
    .selectAll()
    .where('github_username', '=', username)
    .executeTakeFirst();

  if (existing) {
    if (!existing.sourced_from_opening_id) {
      await db
        .updateTable('candidates')
        .set({ sourced_from_opening_id: openingId, updated_at: new Date().toISOString() })
        .where('id', '=', existing.id)
        .execute();
    }
    return existing;
  }

  const now = new Date().toISOString();
  return db
    .insertInto('candidates')
    .values({
      id: nanoid(),
      github_username: username,
      display_name: null,
      graduation_date: null,
      notes: null,
      sourced_from_opening_id: openingId,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function runSourcingJob(sourcingJobId: string, openingId: string): Promise<void> {
  try {
    await setSourcingJobRunning(sourcingJobId);
    notify(sourcingJobId, { status: 'running' });

    const opening = await findOpeningById(openingId);
    if (!opening) throw new Error(`Opening ${openingId} not found`);

    const rolesDir = resolve(process.env.ROLES_DIR ?? '../knowledge/roles');
    const roleMarkdown = readFileSync(resolve(rolesDir, `${opening.role_slug}.md`), 'utf-8');
    const keywords = parseRoleDefinition(roleMarkdown).requiredConcepts;

    const githubToken = process.env.GITHUB_TOKEN ?? '';
    const usernames = await searchGitHubUsers(keywords, githubToken);

    await setSourcingJobFound(sourcingJobId, usernames.length);
    notify(sourcingJobId, { status: 'running', usernames_found: usernames.length });

    let scored = 0;
    for (const username of usernames) {
      const candidate = await upsertCandidateSourced(username, openingId);
      const job = await createJob(candidate.id);
      enqueueJob(job.id, candidate.id, username, candidate.graduation_date);
      scored++;
      await setSourcingJobScored(sourcingJobId, scored);
      notify(sourcingJobId, { status: 'running', usernames_scored: scored });
    }

    await setSourcingJobDone(sourcingJobId);
    notify(sourcingJobId, { status: 'done', usernames_found: usernames.length, usernames_scored: scored });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setSourcingJobFailed(sourcingJobId, message);
    notify(sourcingJobId, { status: 'failed', error: message });
  }
}

export async function startSourcingJob(openingId: string) {
  const job = await createSourcingJob(openingId);
  void runSourcingJob(job.id, openingId);
  return job;
}
