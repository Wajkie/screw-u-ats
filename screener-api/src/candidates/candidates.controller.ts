import type { Context } from 'hono';
import * as repo from './candidates.repository.js';

const GRAD_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidGradDate(value: unknown): value is string {
  return typeof value === 'string' && GRAD_DATE_RE.test(value);
}

export async function createCandidate(c: Context) {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body.github_username !== 'string' || !body.github_username) {
    return c.json({ error: 'github_username is required' }, 400);
  }
  if (body.graduation_date != null && !isValidGradDate(body.graduation_date)) {
    return c.json({ error: 'graduation_date must be YYYY-MM-DD' }, 400);
  }

  try {
    const candidate = await repo.createCandidate(body);
    return c.json(candidate, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return c.json({ error: 'github_username already exists' }, 409);
    }
    throw err;
  }
}

export async function listCandidates(c: Context) {
  const candidates = await repo.listCandidates();
  return c.json(candidates);
}

export async function getCandidate(c: Context) {
  const id = c.req.param('id')!;
  const candidate = await repo.findCandidateById(id);
  if (!candidate) return c.json({ error: 'Not found' }, 404);

  const latestReport = await repo.getLatestReport(id);
  return c.json({ ...candidate, latest_report: latestReport ?? null });
}

export async function updateCandidate(c: Context) {
  const id = c.req.param('id')!;
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

  if ('graduation_date' in body && body.graduation_date != null && !isValidGradDate(body.graduation_date)) {
    return c.json({ error: 'graduation_date must be YYYY-MM-DD' }, 400);
  }

  const candidate = await repo.updateCandidate(id, body);
  if (!candidate) return c.json({ error: 'Not found' }, 404);
  return c.json(candidate);
}

export async function deleteCandidate(c: Context) {
  const id = c.req.param('id')!;
  const deleted = await repo.deleteCandidate(id);
  if (!deleted) return c.json({ error: 'Not found' }, 404);
  return c.body(null, 204);
}
