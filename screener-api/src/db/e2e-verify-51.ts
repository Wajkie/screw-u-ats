import { writeFileSync } from 'fs';
import { db } from './client.js';
import { insertRepoAudits, listRepoAuditsByCandidate } from '../repo-audits/repo-audits.repository.js';

const resultsFile = process.argv[2];
const steps: { label: string; status: 'PASS' | 'FAIL'; reason?: string }[] = [];

async function step(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    steps.push({ label, status: 'PASS' });
    console.log(`✅ ${label}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    steps.push({ label, status: 'FAIL', reason });
    console.error(`❌ ${label}: ${reason}`);
  }
}

const { nanoid } = await import('nanoid');
const candidateId = nanoid();

await step('setup: insert test candidate', async () => {
  await db.insertInto('candidates').values({
    id: candidateId,
    github_username: `e2e-51-${candidateId}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).execute();
});

await step('returns empty array when no audits exist', async () => {
  const results = await listRepoAuditsByCandidate(candidateId);
  if (!Array.isArray(results)) throw new Error('not an array');
  if (results.length !== 0) throw new Error(`expected 0 items, got ${results.length}`);
});

await step('insert two audits with different accessibility scores', async () => {
  await insertRepoAudits(candidateId, [
    {
      repo_name: 'low-a11y',
      url: 'https://low.example.com',
      scores: { accessibility: 50, performance: 70, best_practices: 80, seo: 60 },
      wcag_violations: ['color-contrast', 'label'],
    },
    {
      repo_name: 'high-a11y',
      url: 'https://high.example.com',
      scores: { accessibility: 95, performance: 88, best_practices: 92, seo: 85 },
      wcag_violations: [],
    },
  ]);
});

await step('returns 2 results ordered by accessibility_score DESC', async () => {
  const results = await listRepoAuditsByCandidate(candidateId);
  if (results.length !== 2) throw new Error(`expected 2 items, got ${results.length}`);
  if (results[0].repo_name !== 'high-a11y') throw new Error(`first item should be high-a11y, got ${results[0].repo_name}`);
  if (results[1].repo_name !== 'low-a11y') throw new Error(`second item should be low-a11y, got ${results[1].repo_name}`);
});

await step('wcag_violations is a parsed array, not a raw string', async () => {
  const results = await listRepoAuditsByCandidate(candidateId);
  const low = results.find((r) => r.repo_name === 'low-a11y');
  if (!low) throw new Error('low-a11y not found');
  if (!Array.isArray(low.wcag_violations)) throw new Error(`wcag_violations is ${typeof low.wcag_violations}, expected array`);
  if ((low.wcag_violations as string[])[0] !== 'color-contrast') throw new Error('violation data mismatch');
});

await step('teardown: remove test data', async () => {
  await db.deleteFrom('repo_audits').where('candidate_id', '=', candidateId).execute();
  await db.deleteFrom('candidates').where('id', '=', candidateId).execute();
});

if (resultsFile) writeFileSync(resultsFile, JSON.stringify(steps, null, 2));

const failed = steps.filter((s) => s.status === 'FAIL').length;
process.exit(failed > 0 ? 1 : 0);
