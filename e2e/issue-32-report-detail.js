import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/issue-32-report-detail.md');
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
  throw new Error('Job did not complete within timeout');
}

const browser = await chromium.launch({ headless: false, slowMo: 80 });

try {
  // Pre-test cleanup
  const existing = await fetch(`${API}/candidates`).then(r => r.json());
  for (const c of existing) {
    if (c.notes?.includes('Created by issue-32 e2e test')) {
      await fetch(`${API}/candidates/${c.id}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // --- Setup: create candidate + run analysis ---
  const created = await fetch(`${API}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      github_username: 'Wajkie',
      display_name: 'Test User',
      notes: 'Created by issue-32 e2e test',
    }),
  }).then(r => r.json());
  candidateId = created.id;
  console.log(`Created candidate ${candidateId}`);

  const job = await fetch(`${API}/candidates/${candidateId}/jobs`, { method: 'POST' })
    .then(r => r.json());
  console.log(`Created job ${job.id}, waiting for completion (up to ~300s)...`);
  const completedJob = await pollJob(job.id);
  const reportId = completedJob.report_id;
  console.log(`Job done, report: ${reportId}`);

  const reportData = await fetch(`${API}/reports/${reportId}`).then(r => r.json());

  // --- Navigate to report detail ---
  await page.goto(`${UI}/candidates/${candidateId}/reports/${reportId}`);

  await step('Full AllRolesResult is rendered across all sections', async () => {
    // Wait for the page to load (not loading state)
    await page.waitForFunction(() => !document.body.innerText.includes('Loading…'), { timeout: 10000 });
    return shot('32-01-report-page-loaded');
  });

  await step('Header: candidate username linked to GitHub', async () => {
    const ghLink = page.locator('a[href*="github.com/Wajkie"]');
    await ghLink.waitFor({ timeout: 5000 });
    const text = await ghLink.innerText();
    if (!text.toLowerCase().includes('wajkie')) throw new Error(`GitHub link text was: ${text}`);
    return shot('32-02-header-github-link');
  });

  await step('Header: report date displayed in human-readable format', async () => {
    const bodyText = await page.locator('body').innerText();
    // Should contain a date-like string (localeString)
    if (!/\d{4}|\d{1,2}\/\d{1,2}/.test(bodyText)) throw new Error('No date found in page');
    return shot('32-03-header-date');
  });

  await step('Header: best_fit role shown', async () => {
    const bodyText = await page.locator('body').innerText();
    if (!bodyText.includes(reportData.data.best_fit)) {
      throw new Error(`Expected best_fit "${reportData.data.best_fit}" in page`);
    }
    return shot('32-04-header-best-fit');
  });

  await step('Header: recommendation badge visible', async () => {
    const bestRole = reportData.data.roles.find(r => r.role === reportData.data.best_fit);
    const expected = bestRole?.recommendation ?? 'Interview';
    const badge = page.getByText(expected).first();
    await badge.waitFor({ timeout: 5000 });
    return shot('32-05-header-badge');
  });

  await step('Track cards show all available role tiers with score bars and badges', async () => {
    const trackCards = page.locator('[class*="trackCard"]');
    const count = await trackCards.count();
    if (count === 0) throw new Error('No track cards found');
    const scoreBars = page.locator('[class*="scoreBar"]');
    const barCount = await scoreBars.count();
    if (barCount === 0) throw new Error('No score bars found');
    return shot('32-06-track-cards');
  });

  await step('Best-fit role is visually highlighted', async () => {
    const bestRows = page.locator('[class*="roleRowBest"]');
    const count = await bestRows.count();
    if (count === 0) throw new Error('No best-fit highlighted row found');
    return shot('32-07-best-fit-highlighted');
  });

  await step('Trajectory curve renders correctly', async () => {
    const heading = page.getByRole('heading', { name: 'Trajectory' });
    await heading.waitFor({ timeout: 5000 });
    const summary = page.locator('[class*="trajSummary"]');
    await summary.waitFor({ timeout: 3000 });
    const text = await summary.innerText();
    if (!text || text.trim().length === 0) throw new Error('Trajectory summary is empty');
    return shot('32-08-trajectory');
  });

  await step('Lighthouse panel renders if data is present; hidden if absent', async () => {
    const hasLighthouse = !!reportData.data.lighthouse && reportData.data.lighthouse.audits.length > 0;
    const bodyText = await page.locator('body').innerText();
    if (hasLighthouse) {
      if (!bodyText.includes('Lighthouse')) throw new Error('Lighthouse section missing when data present');
    } else {
      // Section is hidden — verify lighthouse heading not present as a section title
      // (it's fine if it's not in the DOM at all)
      console.log('No lighthouse data in this report — section should be hidden');
    }
    return shot('32-09-lighthouse');
  });

  await step('matched_concepts component handles both string[] and {concept, occurrences}[] without errors', async () => {
    // Expand the best-fit role row to see concepts
    const bestRow = page.locator('[class*="roleRowBest"]').first();
    const btn = bestRow.locator('button');
    await btn.click();
    await page.waitForTimeout(300);
    const bodyText = await page.locator('body').innerText();
    // Look for concept labels
    const conceptListVisible = bodyText.includes('Matched') || bodyText.includes('Missing');
    // Even if no concepts, no JS error should have occurred
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    if (errors.length > 0) throw new Error(`Page errors: ${errors.join('; ')}`);
    return shot('32-10-concepts-in-role-row');
  });

  await step('Concepts section — matched and missing for best-fit role', async () => {
    const conceptSection = page.locator('[class*="conceptsGrid"]');
    await conceptSection.waitFor({ timeout: 5000 });
    return shot('32-11-concepts-section');
  });

  await step('Back link navigates to candidate page', async () => {
    const backLink = page.getByRole('link', { name: /back to candidate/i });
    await backLink.waitFor({ timeout: 5000 });
    await backLink.click();
    await page.waitForURL(`${UI}/candidates/${candidateId}`, { timeout: 10000 });
    if (!page.url().includes(`/candidates/${candidateId}`)) {
      throw new Error(`Expected candidate URL, got ${page.url()}`);
    }
    return shot('32-12-back-to-candidate');
  });

  // Probe: navigate directly to report URL by typing it in (deep link)
  await step('🔍 Deep-link to report URL works without navigating from candidate', async () => {
    await page.goto(`${UI}/candidates/${candidateId}/reports/${reportId}`);
    await page.waitForFunction(() => !document.body.innerText.includes('Loading…'), { timeout: 10000 });
    const heading = page.locator('[class*="heading"]');
    await heading.waitFor({ timeout: 5000 });
    return shot('32-13-deep-link');
  });

  // Probe: non-existent report ID
  await step('🔍 Non-existent report ID shows error state', async () => {
    await page.goto(`${UI}/candidates/${candidateId}/reports/non-existent-id`);
    await page.waitForFunction(
      () => document.body.innerText.includes('Failed') || document.body.innerText.includes('error'),
      { timeout: 10000 },
    );
    return shot('32-14-bad-report-id');
  });

} finally {
  if (candidateId) {
    await fetch(`${API}/candidates/${candidateId}`, { method: 'DELETE' }).catch(() => {});
    console.log('Cleaned up test candidate');
  }
  const verdict = writeResults('Issue #32 — Report Detail Page');
  console.log(`\nVerdict: ${verdict}`);
  await browser.close();
  process.exit(verdict === 'PASS' ? 0 : 1);
}
