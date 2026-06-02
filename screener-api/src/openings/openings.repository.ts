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
      created_at: new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function listOpenings() {
  return db.selectFrom('openings').selectAll().orderBy('created_at', 'desc').execute();
}

export async function findOpeningById(id: string) {
  return db.selectFrom('openings').selectAll().where('id', '=', id).executeTakeFirst();
}

export async function updateOpening(id: string, input: UpdateOpeningInput) {
  const patch: Record<string, string | null> = {};
  if ('title' in input && input.title !== undefined) patch.title = input.title;
  if ('description' in input) patch.description = input.description ?? null;
  if ('status' in input && input.status !== undefined) patch.status = input.status;

  return db.updateTable('openings').set(patch).where('id', '=', id).returningAll().executeTakeFirst();
}

export async function deleteOpening(id: string): Promise<boolean> {
  const existing = await db.selectFrom('openings').select('id').where('id', '=', id).executeTakeFirst();
  if (!existing) return false;
  await db.deleteFrom('openings').where('id', '=', id).execute();
  return true;
}
