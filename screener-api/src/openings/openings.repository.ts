import { nanoid } from 'nanoid';
import { db } from '../db/client.js';
import type { CreateOpeningInput, UpdateOpeningInput } from './openings.schemas.js';

export async function createOpening(input: CreateOpeningInput) {
  return db
    .insertInto('openings')
    .values({
      id: nanoid(),
      title: input.title,
      description: input.description ?? null,
      role_slug: input.role_slug,
      status: input.status,
      location: input.location ?? null,
      work_type: input.work_type ?? null,
      source_url: input.source_url ?? null,
      created_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function listOpenings() {
  return db
    .selectFrom('openings')
    .selectAll()
    .select((eb) =>
      eb
        .selectFrom('candidates')
        .select((eb2) => eb2.fn.countAll<number>().as('n'))
        .whereRef('candidates.sourced_from_opening_id', '=', 'openings.id')
        .as('candidate_count'),
    )
    .orderBy('created_at', 'desc')
    .execute();
}

export async function findOpeningById(id: string) {
  return db.selectFrom('openings').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function updateOpening(id: string, input: UpdateOpeningInput) {
  const patch: Record<string, string | null> = {};
  if ('title' in input && input.title !== undefined) patch.title = input.title;
  if ('description' in input) patch.description = input.description ?? null;
  if ('status' in input && input.status !== undefined) patch.status = input.status;
  if ('location' in input) patch.location = input.location ?? null;
  if ('work_type' in input) patch.work_type = input.work_type ?? null;
  if ('source_url' in input) patch.source_url = input.source_url ?? null;

  return db.updateTable('openings').set(patch).where('id', '=', id).returningAll().executeTakeFirst();
}

export async function deleteOpening(id: string): Promise<boolean> {
  const existing = await db.selectFrom('openings').select('id').where('id', '=', id).executeTakeFirst();
  if (!existing) return false;
  await db.deleteFrom('openings').where('id', '=', id).execute();
  return true;
}
