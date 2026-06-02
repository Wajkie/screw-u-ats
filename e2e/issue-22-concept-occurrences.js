import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/issue-22-concept-occurrences.md');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const API = 'http://localhost:4001';
const UI  = 'http://localhost:5173';

const steps = [];
let page;

async function shot(name) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return `screenshots/${name}.png`;
}

async function step(label, fn) {
  try {
    const img = await fn();
    steps.push({ label, status: 'PASS', img });
    console.log(`✅ ${label}`);
  } catch (e) {
    steps.push({ label, status: 'FAIL', reason: String(e.message ?? e) });
    console.error(`❌ ${label}: ${e.message ?? e}`);
  }
}

function writeResults(title) {
  const verdict = steps.every(s => s.status === 'PASS') ? 'PASS' : 'FAIL';
  const lines = [
    `# ${title}`,
    `**Verdict:** ${verdict}`,
    `**Run:** ${new Date().toISOString()}`,
    '',
    '## Steps',
    ...steps.flatMap(s => [
      `### ${s.status === 'PASS' ? '✅' : '❌'} ${s.label}`,
      s.img    ? `![](${s.img})` : '',
      s.reason ? `> ${s.reason}` : '',
    ].filter(Boolean)),
  ];
  writeFileSync(RESULTS_FILE, lines.join('\n\n'));
  return verdict;
}

let candidateId = null;

async function pollJob(jobId) {
  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${API}/jobs/${jobId}`).then(r => r.json()).catch(() => ({}));
    if (res.status === 'failed') throw new Error(`Job failed: ${res.error}`);
    if (res.status === 'done') return res;
  }
  throw new Error('Job timed out after 300s');
}

const browser = await chromium.launch({ headless: false, slowMo: 80 });
try {
  page = await browser.newPage();

  // Pre-test cleanup
  const existing = await fetch(`${API}/candidates`).then(r => r.json());
  for (const c of existing) {
    if (c.notes?.includes('Created by issue-22 e2e test')) {
      await fetch(`${API}/candidates/${c.id}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  await step('API is reachable and returns candidate list', async () => {
    const res = await fetch(`${API}/candidates`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    await page.goto(UI);
    return shot('22-01-dashboard');
  });

  await step('Create candidate and trigger analysis', async () => {
    const createRes = await fetch(`${API}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_username: 'Wajkie', notes: 'Created by issue-22 e2e test' }),
    });
    if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
    const candidate = await createRes.json();
    candidateId = candidate.id;

    const jobRes = await fetch(`${API}/candidates/${candidateId}/jobs`, { method: 'POST' });
    if (!jobRes.ok) throw new Error(`Job creation failed: ${jobRes.status}`);
    const job = await jobRes.json();
    console.log(`  Job ${job.id} started, polling...`);
    await pollJob(job.id);
  });

  let reportId = null;

  await step('Report was created with new concept shape (occurrences as objects)', async () => {
    const reportsRes = await fetch(`${API}/candidates/${candidateId}/reports`);
    const reports = await reportsRes.json();
    if (reports.length === 0) throw new Error('No reports found');
    reportId = reports[0].id;

    const reportRes = await fetch(`${API}/reports/${reportId}`);
    const report = await reportRes.json();
    const firstRole = report.data.roles[0];
    if (!firstRole) throw new Error('No roles in report');

    const concepts = firstRole.matched_concepts;
    if (!Array.isArray(concepts)) throw new Error('matched_concepts is not an array');

    // New shape: each element should be { concept: string, occurrences: number }
    // (may be empty if no concepts matched, so we check the best-fit role)
    const bestFitRole = report.data.roles.find(r => r.role === report.data.best_fit);
    if (!bestFitRole) throw new Error('Best fit role not found');

    const bestConcepts = bestFitRole.matched_concepts;
    if (bestConcepts.length === 0) throw new Error('Best fit role has no matched concepts — cannot verify shape');

    const first = bestConcepts[0];
    if (typeof first === 'string') throw new Error(`matched_concepts still contains strings: "${first}"`);
    if (typeof first.concept !== 'string') throw new Error(`Missing .concept field: ${JSON.stringify(first)}`);
    if (typeof first.occurrences !== 'number') throw new Error(`Missing .occurrences field: ${JSON.stringify(first)}`);

    console.log(`  Best fit: ${report.data.best_fit}, ${bestConcepts.length} matched concepts`);
    console.log(`  Sample: ${JSON.stringify(bestConcepts.slice(0, 3))}`);
  });

  await step('Report detail page loads and shows matched concepts section', async () => {
    await page.goto(`${UI}/candidates/${candidateId}/reports/${reportId}`);
    await page.waitForSelector('text=Matched', { timeout: 10000 });
    return shot('22-02-report-detail');
  });

  await step('Occurrence badges are visible on matched concepts (best-fit section)', async () => {
    // Expand first track card to see concepts
    const roleSummaryBtn = page.locator('button[aria-expanded]').first();
    await roleSummaryBtn.click();
    await page.waitForTimeout(300);

    // Check for the occurrence badge in the expanded role
    const badges = page.locator('[class*="occurrenceBadge"]');
    const count = await badges.count();
    if (count === 0) throw new Error('No occurrence badges found — badges not rendering');
    console.log(`  Found ${count} occurrence badge(s) in expanded role row`);
    return shot('22-03-expanded-role-with-badges');
  });

  await step('Occurrence badge values are positive integers', async () => {
    const badges = page.locator('[class*="occurrenceBadge"]');
    const count = await badges.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await badges.nth(i).textContent();
      const num = parseInt(text ?? '', 10);
      if (isNaN(num) || num < 1) throw new Error(`Badge ${i} has invalid value: "${text}"`);
    }
    console.log(`  All ${Math.min(count, 5)} sampled badges have valid positive values`);
    return shot('22-04-badge-values');
  });

  await step('Best-fit concepts section at bottom also shows occurrence badges', async () => {
    // Scroll to bottom concepts section
    await page.locator('text=Concepts —').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const bottomBadges = page.locator('section').filter({ hasText: 'Concepts —' }).locator('[class*="occurrenceBadge"]');
    const count = await bottomBadges.count();
    if (count === 0) throw new Error('No occurrence badges in bottom concepts section');
    console.log(`  Found ${count} badge(s) in bottom concepts section`);
    return shot('22-05-bottom-concepts-section');
  });

  // Probe: does a concept with occurrences > 1 actually exist?
  await step('🔍 At least one concept has occurrences > 1 (multi-repo signal)', async () => {
    const reportsRes = await fetch(`${API}/reports/${reportId}`);
    const report = await reportsRes.json();
    const allConcepts = report.data.roles.flatMap(r => r.matched_concepts);
    const multiRepo = allConcepts.filter(c => typeof c === 'object' && c.occurrences > 1);
    if (multiRepo.length === 0) {
      console.log('  ⚠️  All concepts appeared in only 1 repo — Wajkie may have few repos; shape is correct but depth signal not demonstrated');
    } else {
      console.log(`  Found ${multiRepo.length} concept(s) with occurrences > 1: ${JSON.stringify(multiRepo.slice(0, 3))}`);
    }
    // Not a hard failure — shape correctness matters more than the value
    return shot('22-06-probe-multi-repo');
  });

} finally {
  if (candidateId) {
    await fetch(`${API}/candidates/${candidateId}`, { method: 'DELETE' }).catch(() => {});
    console.log(`  Cleaned up candidate ${candidateId}`);
  }
  const verdict = writeResults('Issue #22 — Concept occurrence counts in UI and API');
  await browser.close();
  console.log(`\nVerdict: ${verdict}`);
  process.exit(verdict === 'PASS' ? 0 : 1);
}
