import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { nanoid } from 'nanoid';
import { db } from './db/client.js';
import type { AddressInfo } from 'node:net';

const GRAD_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function createApiApp(): Hono {
  const app = new Hono();
  app.use('*', cors());

  app.post('/candidates', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.github_username !== 'string' || !body.github_username) {
      return c.json({ error: 'github_username is required' }, 400);
    }

    const { github_username, display_name = null, graduation_date = null, notes = null } = body;

    if (graduation_date != null && !GRAD_DATE_RE.test(graduation_date)) {
      return c.json({ error: 'graduation_date must be YYYY-MM-DD' }, 400);
    }

    const now = new Date().toISOString();
    try {
      const candidate = await db
        .insertInto('candidates')
        .values({ id: nanoid(), github_username, display_name, graduation_date, notes, created_at: now, updated_at: now })
        .returningAll()
        .executeTakeFirstOrThrow();
      return c.json(candidate, 201);
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE')) {
        return c.json({ error: 'github_username already exists' }, 409);
      }
      throw err;
    }
  });

  app.get('/candidates', async (c) => {
    const candidates = await db.selectFrom('candidates').selectAll().orderBy('created_at', 'desc').execute();

    const reports = await db
      .selectFrom('reports')
      .select(['candidate_id', 'id', 'best_fit', 'fit_score', 'created_at'])
      .execute();

    const latestByCandidate = new Map<string, (typeof reports)[0]>();
    for (const r of reports) {
      const existing = latestByCandidate.get(r.candidate_id);
      if (!existing || r.created_at > existing.created_at) latestByCandidate.set(r.candidate_id, r);
    }

    return c.json(
      candidates.map((candidate) => {
        const lr = latestByCandidate.get(candidate.id);
        return {
          ...candidate,
          latest_report: lr
            ? { id: lr.id, best_fit: lr.best_fit, fit_score: lr.fit_score, created_at: lr.created_at }
            : null,
        };
      }),
    );
  });

  app.get('/candidates/:id', async (c) => {
    const id = c.req.param('id');
    const candidate = await db.selectFrom('candidates').selectAll().where('id', '=', id).executeTakeFirst();
    if (!candidate) return c.json({ error: 'Not found' }, 404);

    const latestReport = await db
      .selectFrom('reports')
      .select(['id', 'best_fit', 'fit_score', 'created_at'])
      .where('candidate_id', '=', id)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst();

    return c.json({ ...candidate, latest_report: latestReport ?? null });
  });

  app.patch('/candidates/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    if (!body) return c.json({ error: 'Invalid JSON body' }, 400);

    if ('graduation_date' in body && body.graduation_date != null && !GRAD_DATE_RE.test(body.graduation_date)) {
      return c.json({ error: 'graduation_date must be YYYY-MM-DD' }, 400);
    }

    const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
    if ('display_name' in body) patch.display_name = body.display_name ?? null;
    if ('graduation_date' in body) patch.graduation_date = body.graduation_date ?? null;
    if ('notes' in body) patch.notes = body.notes ?? null;

    const candidate = await db
      .updateTable('candidates')
      .set(patch)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();

    if (!candidate) return c.json({ error: 'Not found' }, 404);
    return c.json(candidate);
  });

  app.delete('/candidates/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await db.selectFrom('candidates').select('id').where('id', '=', id).executeTakeFirst();
    if (!existing) return c.json({ error: 'Not found' }, 404);

    // Cascade manually — FK constraints don't have ON DELETE CASCADE in the schema.
    await db.deleteFrom('reports').where('candidate_id', '=', id).execute();
    await db.deleteFrom('analysis_jobs').where('candidate_id', '=', id).execute();
    await db.deleteFrom('candidates').where('id', '=', id).execute();

    return c.body(null, 204);
  });

  return app;
}

export async function startApiServer(port: number): Promise<void> {
  const app = createApiApp();
  await new Promise<void>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port }, (_info: AddressInfo) => resolve());
    server.once('error', reject);
  });
  console.log(`screener-api listening on port ${port}`);
}
