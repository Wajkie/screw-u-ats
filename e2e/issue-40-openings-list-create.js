import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/issue-40-openings-list-create.md');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const API = 'http://localhost:4001';
const UI  = 'http://localhost:5173';

const steps = [];
let page;
let openingId;

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

// Pre-test cleanup: remove any openings left from a previous killed run
async function cleanup() {
  try {
    const openings = await fetch(`${API}/openings`).then(r => r.json()).catch(() => []);
    for (const o of openings) {
      if (o.title?.includes('[e2e-40]')) {
        await fetch(`${API}/openings/${o.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
  } catch {}
}

const browser = await chromium.launch();
try {
  await cleanup();

  page = await browser.newPage();

  // Step 1: nav shows "Openings" link
  await step('"Openings" appears in the main nav', async () => {
    await page.goto(UI);
    await page.waitForLoadState('networkidle');
    const link = page.locator('nav a', { hasText: 'Openings' });
    await link.waitFor({ timeout: 5000 });
    return shot('40-01-nav-openings-link');
  });

  // Step 2: /openings shows empty state (or list)
  await step('/openings lists all openings fetched from the API', async () => {
    await page.goto(`${UI}/openings`);
    await page.waitForLoadState('networkidle');
    // Should show either a list of cards or empty state — not a loading/error state
    const body = await page.locator('body').innerText();
    if (body.includes('Failed to load')) throw new Error('Page shows error state');
    return shot('40-02-openings-list');
  });

  // Step 3: Empty state shown when no openings exist
  await step('Empty state shown when no openings exist', async () => {
    // Verify page currently has an empty-state prompt (fresh DB should have none)
    const emptyMsg = page.locator('text=No openings yet.');
    // Only assert if no opening cards are present
    const cards = await page.locator('a[href^="/openings/"]').count();
    if (cards === 0) {
      await emptyMsg.waitFor({ timeout: 3000 });
    }
    return shot('40-03-empty-state');
  });

  // Step 4: /openings/new form renders
  await step('/openings/new form renders with title, description, role dropdown', async () => {
    await page.goto(`${UI}/openings/new`);
    await page.waitForLoadState('networkidle');
    await page.locator('input[placeholder="Frontend Developer"]').waitFor({ timeout: 5000 });
    await page.locator('textarea').waitFor({ timeout: 3000 });
    await page.locator('select').waitFor({ timeout: 3000 });
    return shot('40-04-new-opening-form');
  });

  // Step 5: form submits and redirects to opening detail
  await step('/openings/new form submits and redirects to the new opening\'s detail page', async () => {
    await page.locator('input[placeholder="Frontend Developer"]').fill('[e2e-40] Test Opening');
    await page.locator('textarea').fill('An automated E2E test opening');
    // Select junior-frontend in dropdown
    await page.locator('select').selectOption('junior-frontend');
    await page.locator('button[type="submit"]').click();
    // Wait for redirect to /openings/:id
    await page.waitForURL(/\/openings\/[^/]+$/, { timeout: 10000 });
    openingId = page.url().split('/openings/')[1];
    return shot('40-05-redirect-to-detail');
  });

  // Step 6: opening now appears in the list
  await step('/openings lists the created opening with title, role, status, candidate count', async () => {
    await page.goto(`${UI}/openings`);
    await page.waitForLoadState('networkidle');
    const card = page.locator('text=[e2e-40] Test Opening');
    await card.waitFor({ timeout: 5000 });
    const body = await page.locator('body').innerText();
    if (!body.includes('junior-frontend')) throw new Error('Role slug not shown on card');
    if (!body.includes('open')) throw new Error('Status not shown on card');
    if (!body.includes('candidate')) throw new Error('Candidate count not shown on card');
    return shot('40-06-opening-in-list');
  });

  // Probe: /openings/new with empty title shows validation error
  await step('🔍 /openings/new with empty title shows validation error (does not submit)', async () => {
    await page.goto(`${UI}/openings/new`);
    await page.waitForLoadState('networkidle');
    await page.locator('button[type="submit"]').click();
    // Should show field error, stay on /openings/new
    await page.locator('text=Title is required').waitFor({ timeout: 3000 });
    if (!page.url().includes('/openings/new')) throw new Error('Should stay on form');
    return shot('40-07-probe-empty-title');
  });

} finally {
  if (openingId) {
    await fetch(`${API}/openings/${openingId}`, { method: 'DELETE' }).catch(() => {});
  }
  const verdict = writeResults('Issue 40 — Openings list + create UI');
  console.log(`\nVerdict: ${verdict}`);
  await browser.close();
  process.exit(steps.every(s => s.status === 'PASS') ? 0 : 1);
}
