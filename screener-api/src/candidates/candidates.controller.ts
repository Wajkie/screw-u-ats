import type { Context } from 'hono';
import * as repo from './candidates.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors.js';

const GRAD_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertValidGradDate(value: unknown) {
  if (value != null && (typeof value !== 'string' || !GRAD_DATE_RE.test(value))) {
    throw new ValidationError('graduation_date must be YYYY-MM-DD');
  }
}

export async function createCandidate(c: Context) {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.github_username !== 'string' || !body.github_username) {
    throw new ValidationError('github_username is required');
  }
  assertValidGradDate(body.graduation_date);

  try {
    const candidate = await repo.createCandidate(body);
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
  const body = await c.req.json().catch(() => null);
  if (!body) throw new ValidationError('Invalid JSON body');

  if ('graduation_date' in body) assertValidGradDate(body.graduation_date);

  const candidate = await repo.updateCandidate(id, body);
  if (!candidate) throw new NotFoundError('Candidate');
  return c.json(candidate);
}

export async function deleteCandidate(c: Context) {
  const id = c.req.param('id')!;
  const deleted = await repo.deleteCandidate(id);
  if (!deleted) throw new NotFoundError('Candidate');
  return c.body(null, 204);
}
