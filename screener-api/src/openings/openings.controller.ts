import type { Context } from 'hono';
import * as repo from './openings.repository.js';
import { batchOpeningsSchema, createOpeningSchema, updateOpeningSchema } from './openings.schemas.js';
import { parseBody } from '../lib/validate.js';
import { NotFoundError } from '../errors.js';

export async function createOpening(c: Context) {
  const input = await parseBody(c, createOpeningSchema);
  const opening = await repo.createOpening(input);
  return c.json(opening, 201);
}

export async function listOpenings(c: Context) {
  return c.json(await repo.listOpenings());
}

export async function getOpening(c: Context) {
  const id = c.req.param('id')!;
  const opening = await repo.findOpeningById(id);
  if (!opening) throw new NotFoundError('Opening');
  return c.json(opening);
}

export async function updateOpening(c: Context) {
  const id = c.req.param('id')!;
  const input = await parseBody(c, updateOpeningSchema);
  const opening = await repo.updateOpening(id, input);
  if (!opening) throw new NotFoundError('Opening');
  return c.json(opening);
}

export async function deleteOpening(c: Context) {
  const id = c.req.param('id')!;
  const deleted = await repo.deleteOpening(id);
  if (!deleted) throw new NotFoundError('Opening');
  return c.body(null, 204);
}

export async function batchOpenings(c: Context) {
  const input = await parseBody(c, batchOpeningsSchema);
  const result = await repo.batchUpsertOpenings(input.openings);
  return c.json(result, 201);
}
