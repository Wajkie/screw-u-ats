import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { findOpeningById } from '../openings/openings.repository.js';
import { findSourcingJobById } from './sourcing.repository.js';
import { startSourcingJob, sourcingEmitters, type SourcingEvent } from './sourcing.runner.js';
import { listCandidatesByOpening } from './sourcing.repository.js';

const TERMINAL = new Set<string>(['done', 'failed']);

const sourcing = new Hono();

sourcing.post('/openings/:id/source', async (c) => {
  const opening = await findOpeningById(c.req.param('id'));
  if (!opening) return c.json({ error: 'Not found' }, 404);
  const job = await startSourcingJob(opening.id);
  return c.json({ jobId: job.id }, 201);
});

sourcing.get('/sourcing-jobs/:id', async (c) => {
  const job = await findSourcingJobById(c.req.param('id'));
  if (!job) return c.json({ error: 'Not found' }, 404);
  return c.json(job);
});

sourcing.get('/sourcing-jobs/:id/stream', async (c) => {
  const id = c.req.param('id');
  const job = await findSourcingJobById(id);
  if (!job) return c.json({ error: 'Not found' }, 404);

  return streamSSE(c, async (stream) => {
    const currentEvent: SourcingEvent = {
      status: job.status as SourcingEvent['status'],
      usernames_found: job.usernames_found ?? undefined,
      usernames_scored: job.usernames_scored ?? undefined,
      ...(job.error ? { error: job.error } : {}),
    };
    await stream.writeSSE({ data: JSON.stringify(currentEvent) });

    if (TERMINAL.has(job.status)) return;

    await new Promise<void>((resolve) => {
      const emit = (event: SourcingEvent): void => {
        void stream.writeSSE({ data: JSON.stringify(event) });
        if (TERMINAL.has(event.status)) resolve();
      };

      if (!sourcingEmitters.has(id)) sourcingEmitters.set(id, new Set());
      const emitters = sourcingEmitters.get(id)!;
      emitters.add(emit);

      stream.onAbort(() => {
        emitters.delete(emit);
        resolve();
      });
    });
  });
});

sourcing.get('/openings/:id/candidates', async (c) => {
  const opening = await findOpeningById(c.req.param('id'));
  if (!opening) return c.json({ error: 'Not found' }, 404);
  const rows = await listCandidatesByOpening(opening.id);
  return c.json(rows);
});

export { sourcing };
