import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { findJobById } from './jobs.repository.js';
import { jobEmitters, type SseEvent } from './jobs.runner.js';

const TERMINAL = new Set<string>(['done', 'failed']);

const jobs = new Hono();

jobs.get('/:id', async (c) => {
  const job = await findJobById(c.req.param('id'));
  if (!job) return c.json({ error: 'Not found' }, 404);
  return c.json(job);
});

jobs.get('/:id/stream', async (c) => {
  const id = c.req.param('id');
  const job = await findJobById(id);
  if (!job) return c.json({ error: 'Not found' }, 404);

  return streamSSE(c, async (stream) => {
    const currentEvent: SseEvent = {
      status: job.status,
      ...(job.report_id ? { report_id: job.report_id } : {}),
      ...(job.error ? { error: job.error } : {}),
    };
    await stream.writeSSE({ data: JSON.stringify(currentEvent) });

    if (TERMINAL.has(job.status)) return;

    await new Promise<void>((resolve) => {
      const emit = (event: SseEvent): void => {
        void stream.writeSSE({ data: JSON.stringify(event) });
        if (TERMINAL.has(event.status)) resolve();
      };

      if (!jobEmitters.has(id)) jobEmitters.set(id, new Set());
      const emitters = jobEmitters.get(id)!;
      emitters.add(emit);

      stream.onAbort(() => {
        emitters.delete(emit);
        resolve();
      });
    });
  });
});

export { jobs };
