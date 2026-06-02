import { Hono } from 'hono';
import { findReportById } from './reports.repository.js';

const reports = new Hono();

reports.get('/:id', async (c) => {
  const report = await findReportById(c.req.param('id'));
  if (!report) return c.json({ error: 'Not found' }, 404);
  return c.json(report);
});

export { reports };
