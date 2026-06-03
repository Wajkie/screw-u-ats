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
    github_username: `e2e-52-${candidateId}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).execute();
});

await step('setup: insert audits with varied a11y scores', async () => {
  await insertRepoAudits(candidateId, [
    {
      repo_name: 'green-site',
      url: 'https://green.example.com',
      scores: { accessibility: 95, performance: 90, best_practices: 88, seo: 92 },
      wcag_violations: [],
    },
    {
      repo_name: 'amber-site',
      url: 'https://amber.example.com',
      scores: { accessibility: 78, performance: 60, best_practices: 70, seo: 65 },
      wcag_violations: ['color-contrast'],
    },
    {
      repo_name: 'red-site',
      url: 'https://red.example.com',
      scores: { accessibility: 45, performance: 50, best_practices: 55, seo: 48 },
      wcag_violations: ['color-contrast', 'label', 'image-alt'],
    },
  ]);
});

await step('audits are returned with all fields needed by AccessibilityBadge', async () => {
  const results = await listRepoAuditsByCandidate(candidateId);
  if (results.length !== 3) throw new Error(`expected 3 items, got ${results.length}`);
  for (const r of results) {
    if (typeof r.url !== 'string') throw new Error(`url missing on ${r.repo_name}`);
    if (typeof r.accessibility_score !== 'number') throw new Error(`accessibility_score missing on ${r.repo_name}`);
    if (!Array.isArray(r.wcag_violations)) throw new Error(`wcag_violations not array on ${r.repo_name}`);
  }
});

await step('green site: a11y >= 90, no violations', async () => {
  const results = await listRepoAuditsByCandidate(candidateId);
  const green = results.find((r) => r.repo_name === 'green-site');
  if (!green) throw new Error('green-site not found');
  if (green.accessibility_score < 90) throw new Error(`expected >= 90, got ${green.accessibility_score}`);
  if (green.wcag_violations.length !== 0) throw new Error('expected no violations');
});

await step('amber site: 70 <= a11y < 90, has 1 violation', async () => {
  const results = await listRepoAuditsByCandidate(candidateId);
  const amber = results.find((r) => r.repo_name === 'amber-site');
  if (!amber) throw new Error('amber-site not found');
  if (amber.accessibility_score < 70 || amber.accessibility_score >= 90) throw new Error(`expected 70-89, got ${amber.accessibility_score}`);
  if (amber.wcag_violations.length !== 1) throw new Error(`expected 1 violation, got ${amber.wcag_violations.length}`);
});

await step('red site: a11y < 70, has 3 violations', async () => {
  const results = await listRepoAuditsByCandidate(candidateId);
  const red = results.find((r) => r.repo_name === 'red-site');
  if (!red) throw new Error('red-site not found');
  if (red.accessibility_score >= 70) throw new Error(`expected < 70, got ${red.accessibility_score}`);
  if (red.wcag_violations.length !== 3) throw new Error(`expected 3 violations, got ${red.wcag_violations.length}`);
});

await step('teardown: remove test data', async () => {
  await db.deleteFrom('repo_audits').where('candidate_id', '=', candidateId).execute();
  await db.deleteFrom('candidates').where('id', '=', candidateId).execute();
});

if (resultsFile) writeFileSync(resultsFile, JSON.stringify(steps, null, 2));

const failed = steps.filter((s) => s.status === 'FAIL').length;
process.exit(failed > 0 ? 1 : 0);
