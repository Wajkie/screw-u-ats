import { Hono } from 'hono';
import { findJobById } from './jobs.repository.js';

const jobs = new Hono();

jobs.get('/:id', async (c) => {
  const job = await findJobById(c.req.param('id'));
  if (!job) return c.json({ error: 'Not found' }, 404);
  return c.json(job);
});

export { jobs };
