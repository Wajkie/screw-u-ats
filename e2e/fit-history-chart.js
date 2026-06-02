import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/fit-history-chart.md');
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

// Find an existing candidate that has >= 2 reports
async function findCandidateWithHistory() {
  const candidates = await fetch(`${API}/candidates`).then(r => r.json());
  for (const c of candidates) {
    const reports = await fetch(`${API}/candidates/${c.id}/reports`).then(r => r.json());
    if (reports.length >= 2) return c;
  }
  return null;
}

const browser = await chromium.launch();
let probeCandidateId = null;

try {
  page = await browser.newPage();

  let candidate = null;

  await step('Find existing candidate with >= 2 reports', async () => {
    candidate = await findCandidateWithHistory();
    if (!candidate) throw new Error('No candidate with multiple reports found in DB — run two analyses first');
    console.log(`  Using candidate: ${candidate.github_username} (${candidate.id})`);
  });

  if (!candidate) {
    writeResults('Fit History Chart');
    await browser.close();
    process.exit(1);
  }

  await step('GET /candidates/:id/fit-history returns >= 2 ordered entries', async () => {
    const history = await fetch(`${API}/candidates/${candidate.id}/fit-history`).then(r => r.json());
    if (!Array.isArray(history) || history.length < 2) {
      throw new Error(`Expected >= 2 entries, got ${history.length}`);
    }
    for (const e of history) {
      if (typeof e.fit_score !== 'number') throw new Error(`Missing fit_score: ${JSON.stringify(e)}`);
      if (!e.best_fit) throw new Error(`Missing best_fit: ${JSON.stringify(e)}`);
      if (!e.created_at) throw new Error(`Missing created_at: ${JSON.stringify(e)}`);
    }
    // Verify ascending order
    for (let i = 1; i < history.length; i++) {
      if (history[i].created_at < history[i - 1].created_at) {
        throw new Error('History not in ascending order');
      }
    }
  });

  await step('Candidate detail page shows "Score over time" section', async () => {
    await page.goto(`${UI}/candidates/${candidate.id}`);
    await page.waitForSelector('h1', { timeout: 10000 });
    const headings = await page.$$eval('h2', els => els.map(e => e.textContent?.trim()));
    if (!headings.some(h => h?.toLowerCase().includes('score over time'))) {
      throw new Error(`"Score over time" not found. Got: ${headings.join(', ')}`);
    }
    return shot('fit-history-chart-section');
  });

  await step('SVG chart renders polyline and >= 2 dots', async () => {
    const polylineCount = await page.$$eval('polyline', els => els.length);
    const circleCount = await page.$$eval('circle', els => els.length);
    if (polylineCount === 0) throw new Error('No <polyline> in SVG');
    if (circleCount < 2) throw new Error(`Expected >= 2 dots, got ${circleCount}`);
    return shot('fit-history-chart-svg');
  });

  await step('Chart section is absent for a candidate with 0 reports (probe)', async () => {
    // Create a fresh candidate with no analyses
    const res = await fetch(`${API}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_username: `probe-chart-${Date.now()}`, notes: 'fit-history-chart e2e probe' }),
    });
    if (!res.ok) throw new Error(`POST /candidates → ${res.status}`);
    const probe = await res.json();
    probeCandidateId = probe.id;

    await page.goto(`${UI}/candidates/${probe.id}`);
    await page.waitForSelector('h1', { timeout: 10000 });
    const headings = await page.$$eval('h2', els => els.map(e => e.textContent?.trim()));
    if (headings.some(h => h?.toLowerCase().includes('score over time'))) {
      throw new Error('"Score over time" shown even with 0 reports');
    }
    return shot('fit-history-chart-hidden');
  });

} finally {
  if (probeCandidateId) {
    await fetch(`${API}/candidates/${probeCandidateId}`, { method: 'DELETE' }).catch(() => {});
  }
  await browser.close();
  const verdict = writeResults('Fit History Chart');
  console.log(`\nVerdict: ${verdict}`);
  process.exit(verdict === 'PASS' ? 0 : 1);
}
