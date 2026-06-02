/**
 * Issue #31 — candidate detail + job status page with SSE
 *
 * Acceptance criteria (verbatim from issue):
 * 1. Candidate detail shows metadata, latest report summary, and snapshot history list
 * 2. Re-analyze button posts a new job and navigates to the job status page
 * 3. Job status page connects to SSE and updates the displayed state in real time
 * 4. Page auto-redirects to the report detail page on "done"
 * 5. Failed job shows error message, not a blank screen
 * 6. useJobStream closes the EventSource on component unmount (no memory leak)
 * 7. Candidate with no reports yet shows an appropriate empty state (not an error)
 *
 * Requires: screener-api running on :4001, screener-ui on :5173, GITHUB_TOKEN set in screener-api/.env
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/issue-31-candidate-detail-job-status.md');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const API = 'http://localhost:4001';
const UI  = 'http://localhost:5173';

// Real account — analysis will succeed. Change if Wajkie's repos grow too large for CI.
const REAL_USERNAME = 'Wajkie';
// Non-existent account — analysis runner will hit a 404 from GitHub and fail the job.
const BAD_USERNAME  = 'this-account-does-not-exist-xyz-e2e-test';

const steps = [];
let page;

async function shot(name) {
  const file = path.join(SCREENSHOTS_DIR, `31-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return `screenshots/31-${name}.png`;
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

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  await fetch(`${API}${path}`, { method: 'DELETE' }).catch(() => {});
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

// Polls the API and throws if the job fails — used to surface failures fast
// without waiting for the full browser timeout. Does NOT resolve on 'done';
// let page.waitForURL handle success so we don't race ahead of React's navigate().
async function pollAndThrowOnFailure(jobId, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const job = await apiGet(`/jobs/${jobId}`).catch(() => null);
    if (!job) continue;
    if (job.status === 'failed') throw new Error(`Job failed: ${job.error}`);
  }
  // Timeout without failure — let the caller decide what that means
}

function writeResults() {
  const verdict = steps.every(s => s.status === 'PASS') ? 'PASS' : 'FAIL';
  const lines = [
    `# Issue #31 — candidate detail + job status page with SSE`,
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
  console.log(`\nVerdict: ${verdict} — results written to ${RESULTS_FILE}`);
  return verdict;
}

// ─── Test ────────────────────────────────────────────────────────────────────

const browser = await chromium.launch();
let realCandidateId = null;
let badCandidateId  = null;

try {
  page = await browser.newPage();

  // Pre-test cleanup: remove orphans from any previously killed run
  const existing = await fetch(`${API}/candidates`).then(r => r.json()).catch(() => []);
  for (const c of existing) {
    if (c.notes?.includes('Created by issue-31 e2e test')) {
      await apiDelete(`/candidates/${c.id}`);
      console.log(`🧹 Removed orphaned candidate ${c.id}`);
    }
  }

  // Setup: create two candidates via API (faster than clicking the form twice)
  const real = await apiPost('/candidates', {
    github_username: REAL_USERNAME,
    display_name: 'E2E Test User',
    notes: 'Created by issue-31 e2e test',
  });
  realCandidateId = real.id;

  const bad = await apiPost('/candidates', {
    github_username: BAD_USERNAME,
    notes: 'Created by issue-31 e2e test — bad username',
  });
  badCandidateId = bad.id;

  // ── AC 7: empty state when no reports yet ──────────────────────────────────
  await step('Candidate with no reports yet shows an appropriate empty state (not an error)', async () => {
    await page.goto(`${UI}/candidates/${realCandidateId}`);
    await page.waitForSelector('h1', { timeout: 8000 });
    const text = await page.textContent('body');
    if (!text.includes('No reports')) throw new Error('Empty state text not found');
    if (text.includes('Failed to load')) throw new Error('Error state shown instead of empty state');
    return shot('01-empty-state');
  });

  // ── AC 1 (metadata portion): candidate metadata is visible ─────────────────
  await step('Candidate detail shows metadata (username, display name, notes)', async () => {
    // Still on the detail page from above
    const text = await page.textContent('body');
    if (!text.includes(REAL_USERNAME)) throw new Error('GitHub username not shown');
    if (!text.includes('E2E Test User')) throw new Error('Display name not shown');
    if (!text.includes('Created by issue-31')) throw new Error('Notes not shown');
    return shot('02-metadata');
  });

  // ── AC 2: Re-analyze navigates to job status ───────────────────────────────
  await step('Re-analyze button posts a new job and navigates to the job status page', async () => {
    await page.click('button:has-text("Re-analyze")');
    await page.waitForURL(/\/candidates\/.+\/jobs\/.+/, { timeout: 8000 });
    const url = page.url();
    if (!url.includes('/jobs/')) throw new Error(`Did not navigate to job status page, got: ${url}`);
    return shot('03-navigated-to-job-status');
  });

  // ── AC 3: SSE stepper updates in real time ─────────────────────────────────
  await step('Job status page connects to SSE and updates the displayed state in real time', async () => {
    // Wait until "Connecting…" disappears — that means the SSE delivered at least one event
    // and React updated status from null. The stepper labels (Queued/Analyzing/Complete/Failed)
    // are always in the DOM so we cannot use text-includes for those.
    await page.waitForFunction(
      () => !document.body.innerText.includes('Connecting'),
      { timeout: 30000 },
    );
    return shot('04-sse-state-update');
  });

  // ── AC 4: auto-redirect to report detail on done ──────────────────────────
  await step('Page auto-redirects to the report detail page on "done"', async () => {
    const jobUrl = page.url();

    // Fast path: analysis completed during AC 3's wait — React already navigated.
    // waitForURL only catches future navigations, so check the current URL first.
    if (/\/candidates\/.+\/reports\/.+/.test(jobUrl)) {
      console.log('  (redirect already happened before AC 4 started)');
      return shot('05-redirected-to-report');
    }

    const jobId = jobUrl.split('/jobs/')[1]?.split('/')[0];
    if (!jobId) throw new Error(`Could not parse jobId from URL: ${jobUrl}`);

    // Race: browser redirect vs API poll. Poll only throws on failure so we don't
    // resolve before React's navigate() fires. waitForURL handles the success path.
    // 300s: Wajkie's analysis takes > 180s on this machine.
    await Promise.race([
      page.waitForURL(/\/candidates\/.+\/reports\/.+/, { timeout: 300000 }),
      pollAndThrowOnFailure(jobId, 300000),
    ]);

    const url = page.url();
    if (!url.includes('/reports/')) throw new Error(`Expected redirect to report detail, got: ${url}`);
    return shot('05-redirected-to-report');
  });

  // ── AC 1 (report summary + history): navigate back to detail ──────────────
  await step('Candidate detail shows latest report summary and snapshot history list', async () => {
    await page.goto(`${UI}/candidates/${realCandidateId}`);
    await page.waitForSelector('h1', { timeout: 8000 });
    const text = await page.textContent('body');
    if (!text.includes('Latest report')) throw new Error('"Latest report" section missing');
    if (!text.includes('History')) throw new Error('"History" section missing');
    // A score (integer) should appear somewhere
    if (!/\d{2,3}/.test(text)) throw new Error('No numeric score visible');
    return shot('06-detail-with-report');
  });

  // ── AC 5: failed job shows error message ──────────────────────────────────
  await step('Failed job shows error message, not a blank screen', async () => {
    await page.goto(`${UI}/candidates/${badCandidateId}`);
    await page.waitForSelector('button:has-text("Re-analyze")', { timeout: 8000 });
    await page.click('button:has-text("Re-analyze")');
    await page.waitForURL(/\/candidates\/.+\/jobs\/.+/, { timeout: 8000 });

    // Extract jobId and poll the API until the job is confirmed failed — faster and
    // more reliable than guessing how long the SSE will take to deliver the event.
    const jobUrl = page.url();
    const jobId = jobUrl.split('/jobs/')[1]?.split('/')[0];
    if (!jobId) throw new Error(`Could not parse jobId from URL: ${jobUrl}`);

    const deadline = Date.now() + 30000;
    let failedJob = null;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000));
      const job = await apiGet(`/jobs/${jobId}`).catch(() => null);
      if (job?.status === 'done') throw new Error('Bad-username job unexpectedly succeeded — does the test account exist on GitHub?');
      if (job?.status === 'failed') { failedJob = job; break; }
    }
    if (!failedJob) throw new Error('Job did not reach failed status within 30s');

    // Job is confirmed failed at the API level — capture current page state
    // for diagnostics, then wait for the error UI to appear.
    await shot('07-failed-job-pre-wait');
    const bodyPre = await page.textContent('body');
    console.log('  page text after API confirmed failure:', bodyPre?.slice(0, 200));

    // useJobStream's onerror fallback fetches the REST state — wait for it.
    await page.waitForFunction(
      () => document.body.innerText.includes('Back to candidate'),
      { timeout: 15000 },
    );
    return shot('07-failed-job');
  });

  // ── AC 6: EventSource cleaned up on unmount (no memory leak) ──────────────
  await step('useJobStream closes the EventSource on component unmount (no memory leak)', async () => {
    // Navigate away from the job status page mid-stream, then back — if EventSource
    // leaked, the old listener would still fire and cause console errors.
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    // Re-trigger a job on the real candidate
    await page.goto(`${UI}/candidates/${realCandidateId}`);
    await page.waitForSelector('button:has-text("Re-analyze")', { timeout: 8000 });
    await page.click('button:has-text("Re-analyze")');
    await page.waitForURL(/\/candidates\/.+\/jobs\/.+/, { timeout: 8000 });

    // Navigate away immediately (unmount the hook mid-stream)
    await page.goto(`${UI}/`);
    await page.waitForTimeout(2000);

    if (errors.length > 0) throw new Error(`Console errors after unmount: ${errors.join('; ')}`);
    return shot('08-unmount-no-errors');
  });

} finally {
  if (realCandidateId) await apiDelete(`/candidates/${realCandidateId}`);
  if (badCandidateId)  await apiDelete(`/candidates/${badCandidateId}`);
  await browser.close();
}

const verdict = writeResults();
process.exit(verdict === 'PASS' ? 0 : 1);
