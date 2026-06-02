/**
 * Issue #29 — screener-ui frontend scaffold (Vite + React Router + TanStack Query)
 *
 * Verifies the skeleton: layout renders, nav is present, all planned routes
 * exist and render something (not a crash/404), and the API client is wired up.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/issue-29-screener-ui-scaffold.md');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const UI = 'http://localhost:5173';

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

const browser = await chromium.launch({ headless: false, slowMo: 60 });
const errors = [];

try {
  page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(10000);

  await step('npm run dev starts and serves the app (dev server responds)', async () => {
    await page.goto(UI, { waitUntil: 'networkidle' });
    // Should not show a Vite error overlay or blank page
    const title = await page.title();
    if (!title) throw new Error('Page has no title');
    return shot('29-01-app-loads');
  });

  await step('Layout renders nav with links', async () => {
    // Nav should contain at least one link (Dashboard / home)
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();
    if (count === 0) throw new Error('No nav links found');
    return shot('29-02-layout-nav');
  });

  await step('Route / renders (Dashboard placeholder or actual content)', async () => {
    await page.goto(`${UI}/`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('/ rendered empty body');
    // Should not be a raw "Not Found" with no content
    if (body.trim() === '404') throw new Error('/ returned 404 text');
    return shot('29-03-route-root');
  });

  await step('Route /candidates/new renders (form or placeholder)', async () => {
    await page.goto(`${UI}/candidates/new`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('/candidates/new rendered empty body');
    return shot('29-04-route-candidates-new');
  });

  await step('Route /candidates/:id renders (detail or placeholder)', async () => {
    await page.goto(`${UI}/candidates/test-id`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('/candidates/:id rendered empty body');
    return shot('29-05-route-candidate-detail');
  });

  await step('Route /candidates/:id/jobs/:jobId renders (job status or placeholder)', async () => {
    await page.goto(`${UI}/candidates/test-id/jobs/test-job`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('/candidates/:id/jobs/:jobId rendered empty body');
    return shot('29-06-route-job-status');
  });

  await step('Route /candidates/:id/reports/:reportId renders (report detail or placeholder)', async () => {
    await page.goto(`${UI}/candidates/test-id/reports/test-report`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('/candidates/:id/reports/:reportId rendered empty body');
    return shot('29-07-route-report-detail');
  });

  await step('Route /roles/:role renders (leaderboard placeholder)', async () => {
    await page.goto(`${UI}/roles/junior-frontend`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('/roles/:role rendered empty body');
    return shot('29-08-route-roles');
  });

  await step('Unknown route shows Not Found (no crash)', async () => {
    await page.goto(`${UI}/this/does/not/exist`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('Unknown route rendered empty body');
    return shot('29-09-route-not-found');
  });

  await step('QueryClientProvider wired — TanStack Query is available (no "No QueryClient" error)', async () => {
    // Navigate to a data page; if QueryClientProvider is missing React Query throws an invariant error
    await page.goto(`${UI}/`, { waitUntil: 'networkidle' });
    const hasQueryError = errors.some(e => e.includes('QueryClient') || e.includes('QueryClientProvider'));
    if (hasQueryError) throw new Error(`QueryClient error: ${errors.join('; ')}`);
    return shot('29-10-query-client-wired');
  });

  await step('🔍 No unhandled JS errors occurred during navigation', async () => {
    if (errors.length > 0) throw new Error(`Page errors: ${errors.join('; ')}`);
    return shot('29-11-no-errors');
  });

} finally {
  const verdict = writeResults('Issue #29 — screener-ui frontend scaffold');
  console.log(`\nVerdict: ${verdict}`);
  await browser.close();
  process.exit(verdict === 'PASS' ? 0 : 1);
}
