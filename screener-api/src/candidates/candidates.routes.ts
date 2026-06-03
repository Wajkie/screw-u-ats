import { Hono } from 'hono';
import * as controller from './candidates.controller.js';
import { findCandidateById } from './candidates.repository.js';
import { createJob } from '../jobs/jobs.repository.js';
import { enqueueJob } from '../jobs/jobs.runner.js';
import { listReportsByCandidate, fitHistoryByCandidate } from '../reports/reports.repository.js';

const candidates = new Hono();

candidates.post('/', controller.createCandidate);
candidates.get('/', controller.listCandidates);
candidates.get('/:id', controller.getCandidate);
candidates.patch('/:id', controller.updateCandidate);
candidates.delete('/:id', controller.deleteCandidate);

candidates.get('/:id/reports', async (c) => {
  const candidate = await findCandidateById(c.req.param('id'));
  if (!candidate) return c.json({ error: 'Candidate not found' }, 404);
  return c.json(await listReportsByCandidate(candidate.id));
});

candidates.get('/:id/fit-history', async (c) => {
  const candidate = await findCandidateById(c.req.param('id'));
  if (!candidate) return c.json({ error: 'Candidate not found' }, 404);
  return c.json(await fitHistoryByCandidate(candidate.id));
});

candidates.post('/:id/jobs', async (c) => {
  const candidate = await findCandidateById(c.req.param('id'));
  if (!candidate) return c.json({ error: 'Candidate not found' }, 404);

  const body = await c.req.json().catch(() => ({})) as { include_lighthouse?: boolean };
  const includeLighthouse = body.include_lighthouse === true && !!process.env.PAGESPEED_API_KEY;

  const job = await createJob(candidate.id);
  enqueueJob(job.id, candidate.id, candidate.github_username, candidate.graduation_date, includeLighthouse);
  return c.json(job, 202);
});

export { candidates };
