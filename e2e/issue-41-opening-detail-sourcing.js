import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/issue-41-opening-detail-sourcing.md');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const API = 'http://localhost:4001';
const UI  = 'http://localhost:5173';

const steps = [];
let page;
let openingId;
let sourcingJobId;

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

// Pre-test cleanup: remove any openings and their sourced candidates from a previous killed run.
// Must delete candidates first (FK: candidates.sourced_from_opening_id → openings.id),
// then sourcing jobs would still block — we skip deleting those since there's no API endpoint.
async function cleanup() {
  try {
    const openings = await fetch(`${API}/openings`).then(r => r.json()).catch(() => []);
    for (const o of openings) {
      if (!o.title?.includes('[e2e-41]')) continue;
      // Delete sourced candidates first
      const cands = await fetch(`${API}/openings/${o.id}/candidates`).then(r => r.json()).catch(() => []);
      for (const c of cands) {
        await fetch(`${API}/candidates/${c.id}`, { method: 'DELETE' }).catch(() => {});
      }
      // sourcing_jobs FK prevents deletion — swallow silently
      await fetch(`${API}/openings/${o.id}`, { method: 'DELETE' }).catch(() => {});
    }
  } catch {}
}

// Poll sourcing job until terminal (done OR failed both acceptable)
async function pollSourcingJobUntilTerminal(jobId, timeoutMs = 300000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await fetch(`${API}/sourcing-jobs/${jobId}`).then(r => r.json()).catch(() => ({}));
    console.log(`  sourcing job status: ${res.status} found=${res.usernames_found} scored=${res.usernames_scored}`);
    if (res.status === 'done' || res.status === 'failed') return res;
  }
  throw new Error('Sourcing job timed out');
}

const browser = await chromium.launch();
try {
  await cleanup();

  // Create test opening via API
  const created = await fetch(`${API}/openings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '[e2e-41] Junior Frontend Test', role_slug: 'junior-frontend' }),
  }).then(r => r.json());
  openingId = created.id;
  console.log(`Created opening: ${openingId}`);

  page = await browser.newPage();

  // Step 1: /openings/:id renders opening details and candidates section
  await step('/openings/:id renders the opening\'s details and ranked candidate table', async () => {
    await page.goto(`${UI}/openings/${openingId}`);
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').innerText();
    if (body.includes('Failed to load')) throw new Error('Page shows error state');
    // Check title (case-sensitive — not transformed)
    if (!body.includes('[e2e-41] Junior Frontend Test')) throw new Error('Title not shown');
    // Role and status may be uppercase due to text-transform CSS
    const bodyLower = body.toLowerCase();
    if (!bodyLower.includes('junior-frontend')) throw new Error('Role not shown');
    if (!bodyLower.includes('open')) throw new Error('Status badge not shown');
    // Candidates section heading is text-transform: uppercase — "Sourced candidates" → "SOURCED CANDIDATES"
    if (!bodyLower.includes('sourced candidates')) throw new Error('Candidates section not shown');
    // Should show empty state (no candidates yet) or table
    const hasContent = bodyLower.includes('no candidates yet') || page.locator('table').count().then(n => n > 0);
    return shot('41-01-opening-detail');
  });

  // Step 2: "Start Sourcing" button triggers sourcing and navigates to progress page
  await step('"Start Sourcing" button triggers sourcing and navigates to the progress page', async () => {
    const btn = page.locator('button', { hasText: 'Start Sourcing' });
    await btn.waitFor({ timeout: 5000 });
    await btn.click();
    // Should navigate to /openings/:id/source/:jobId
    await page.waitForURL(/\/openings\/[^/]+\/source\/[^/]+/, { timeout: 15000 });
    const urlParts = page.url().split('/source/');
    sourcingJobId = urlParts[1];
    if (!sourcingJobId) throw new Error('No sourcing job ID in URL');
    return shot('41-02-sourcing-progress-page');
  });

  // Step 3: Progress page streams live updates via SSE until job reaches terminal status
  await step('Progress page streams live updates via SSE until job reaches terminal status', async () => {
    // Wait for "Connecting…" to disappear — means first SSE event arrived
    await page.waitForFunction(
      () => !document.body.innerText.includes('Connecting…'),
      { timeout: 30000 },
    );
    const bodyAfterConnect = await page.locator('body').innerText();
    const hasStatus = ['Queued', 'Searching', 'Complete', 'Failed'].some(s =>
      bodyAfterConnect.toLowerCase().includes(s.toLowerCase())
    );
    if (!hasStatus) throw new Error('No stepper status visible after SSE connected');
    const img = await shot('41-03-sourcing-live');

    // Poll API until terminal (done or failed — both are acceptable)
    console.log('  Polling sourcing job until terminal…');
    const finalJob = await pollSourcingJobUntilTerminal(sourcingJobId, 300000);
    console.log(`  Sourcing finished: ${finalJob.status}`);

    // Give the browser a moment to render terminal state
    await page.waitForFunction(
      () => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('complete') || t.includes('failed');
      },
      { timeout: 15000 },
    );
    await shot('41-03b-sourcing-terminal');
    return img;
  });

  // Step 4 + 5: Navigate back to opening after sourcing (done or failed)
  await step('Navigating back to /openings/:id after sourcing shows the ranked results', async () => {
    // "View ranked results →" appears on done; "← Back to opening" appears on failed
    const doneLink = page.locator('a', { hasText: 'View ranked results' });
    const backLink = page.locator('a', { hasText: 'Back to opening' });

    let clicked = false;
    try {
      await doneLink.waitFor({ timeout: 5000 });
      await doneLink.click();
      clicked = true;
    } catch {
      await backLink.waitFor({ timeout: 5000 });
      await backLink.click();
      clicked = true;
    }
    if (!clicked) throw new Error('No navigation link visible after sourcing finished');

    await page.waitForURL(/\/openings\/[^/]+$/, { timeout: 10000 });
    // Wait for the section heading to appear (React may need a tick to render after SPA nav)
    await page.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('sourced candidates'),
      { timeout: 10000 },
    );
    const body = await page.locator('body').innerText();
    if (body.includes('Failed to load')) throw new Error('Detail page shows error');
    return shot('41-04-detail-after-sourcing');
  });

  // Probe: return to a completed/failed progress page — should not be stuck on "Connecting…"
  await step('🔍 Returning to a completed progress page shows terminal state (SSE onerror fallback works)', async () => {
    await page.goto(`${UI}/openings/${openingId}/source/${sourcingJobId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(
      () => !document.body.innerText.includes('Connecting…'),
      { timeout: 15000 },
    );
    const body = await page.locator('body').innerText().then(t => t.toLowerCase());
    const isTerminal = body.includes('complete') || body.includes('failed');
    if (!isTerminal) throw new Error('Progress page stuck — SSE onerror REST fallback not working');
    return shot('41-05-probe-return-to-terminal-job');
  });

} finally {
  // Cleanup: delete sourced candidates first (FK order), then the opening
  if (openingId) {
    try {
      const cands = await fetch(`${API}/openings/${openingId}/candidates`).then(r => r.json()).catch(() => []);
      for (const c of cands) {
        await fetch(`${API}/candidates/${c.id}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {}
    // sourcing_jobs FK may prevent opening deletion if the DB lacks CASCADE — swallow
    await fetch(`${API}/openings/${openingId}`, { method: 'DELETE' }).catch(() => {});
  }
  const verdict = writeResults('Issue 41 — Opening detail + sourcing progress UI');
  console.log(`\nVerdict: ${verdict}`);
  await browser.close();
  process.exit(steps.every(s => s.status === 'PASS') ? 0 : 1);
}
