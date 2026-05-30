import type { Context } from 'hono';
import * as repo from './candidates.repository.js';
import { CreateCandidateSchema, UpdateCandidateSchema } from './candidates.schemas.js';
import { parseBody } from '../lib/validate.js';
import { ConflictError, NotFoundError } from '../errors.js';

export async function createCandidate(c: Context) {
  const input = await parseBody(c, CreateCandidateSchema);

  try {
    const candidate = await repo.createCandidate(input);
    return c.json(candidate, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      throw new ConflictError('github_username already exists');
    }
    throw err;
  }
}

export async function listCandidates(c: Context) {
  return c.json(await repo.listCandidates());
}

export async function getCandidate(c: Context) {
  const id = c.req.param('id')!;
  const candidate = await repo.findCandidateById(id);
  if (!candidate) throw new NotFoundError('Candidate');

  const latestReport = await repo.getLatestReport(id);
  return c.json({ ...candidate, latest_report: latestReport ?? null });
}

export async function updateCandidate(c: Context) {
  const id = c.req.param('id')!;
  const input = await parseBody(c, UpdateCandidateSchema);

  const candidate = await repo.updateCandidate(id, input);
  if (!candidate) throw new NotFoundError('Candidate');
  return c.json(candidate);
}

export async function deleteCandidate(c: Context) {
  const id = c.req.param('id')!;
  const deleted = await repo.deleteCandidate(id);
  if (!deleted) throw new NotFoundError('Candidate');
  return c.body(null, 204);
}
