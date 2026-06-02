# verifier-screener-ui

End-to-end testing scaffold for the screener-ui + screener-api full stack.

## Philosophy

Tests verify acceptance criteria vertically — browser → API → database. A loading state is not evidence. Every AC must be confirmed with real data flowing through the full stack.

## File conventions

| Artifact | Path |
|---|---|
| Test script | `e2e/issue-{N}-{slug}.js` |
| Results report | `e2e/results/issue-{N}-{slug}.md` |
| Screenshots | `e2e/results/screenshots/{N}-{step}-{description}.png` |

All three are committed. Test evidence travels with the code.

## Prerequisites

Both servers must be running before the test script executes.

**API** — run as a background PowerShell task from repo root:
```
cd E:\inlämningsuppgifter\codescreen\screener-api; $env:NODE_OPTIONS="--use-system-ca"; npm run dev
```
`NODE_OPTIONS=--use-system-ca` is required on this Windows machine — without it outbound HTTPS calls to the GitHub API fail with "fetch failed" and every analysis job errors immediately.

**`GITHUB_TOKEN` must be in `screener-api/.env`**, not the repo root `.env`. If the file doesn't exist yet:
```powershell
Copy-Item screener-api\.env.example screener-api\.env
# then open screener-api/.env and fill in GITHUB_TOKEN
```

Poll readiness: `GET http://localhost:4001/candidates` returns 200.

**UI** — run as a background PowerShell task from repo root:
```
cd E:\inlämningsuppgifter\codescreen\screener-ui; npx vite --port 5173
```
Check before starting — reuse if already up:
```powershell
$tc = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue
if ($tc.TcpTestSucceeded) { Write-Host "already up" }
```
**Windows note:** Vite binds to `[::1]:5173` (IPv6). `Test-NetConnection` works; `Invoke-WebRequest` does not. Playwright handles it fine.

## Running a test

From the repo root (Playwright is in root `node_modules`):
```powershell
cd E:\inlämningsuppgifter\codescreen
node e2e/issue-{N}-{slug}.js
```
Exit code 0 = all steps passed. Exit code 1 = one or more failed. The results file and screenshots are written regardless of outcome.

## Test harness pattern

Each test file is a standalone Node ESM script. No test framework — plain Playwright + an in-process result collector.

```javascript
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'results/screenshots');
const RESULTS_FILE    = path.join(__dirname, 'results/issue-N-slug.md');
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const API = 'http://localhost:4001';
const UI  = 'http://localhost:5173';

const steps = [];
let page;

async function shot(name) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return `screenshots/${name}.png`;   // relative for the MD link
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
```

## Mapping acceptance criteria to steps

Each bullet in the issue's **Acceptance criteria** section becomes one `step()` call. Use the AC text as the label. Navigate to the surface, trigger the behaviour, assert the outcome, call `shot()` for evidence.

## SSE race condition — onerror before onmessage

When a job is already in a terminal state and the browser opens an SSE stream, Hono sends the snapshot event and immediately closes the connection. Chromium can fire `onerror` before `onmessage` in this case — the browser sees the EOF before fully parsing the event data. Result: `status` stays `null`, the terminal UI never renders.

**Fix in `useJobStream.ts`** — `onerror` must fall back to REST:
```javascript
es.onerror = () => {
  es.close();
  void fetch(`${API_URL}/jobs/${jobId}`)
    .then(r => r.ok ? r.json() : null)
    .then(job => {
      if (!job) { setError('Connection lost.'); return; }
      setStatus(job.status);
      if (job.report_id) setReportId(job.report_id);
      if (job.error) setError(job.error);
    })
    .catch(() => setError('Connection lost.'));
};
```

## waitForURL misses already-happened navigations

`page.waitForURL(pattern)` only catches future navigations. If the redirect already occurred (fast analysis completing during a prior `waitForFunction`), the call waits forever. Always check the current URL first:

```javascript
if (/\/candidates\/.+\/reports\/.+/.test(page.url())) {
  return shot('done'); // redirect already happened
}
await page.waitForURL(/\/candidates\/.+\/reports\/.+/, { timeout: 300000 });
```

**Analysis timeout note:** Wajkie's account takes ~200s on this Windows machine. Use 300s for `waitForURL` on real-analysis steps, not 180s.

## SSE / real-time UI testing

**Don't wait for terminal state text — confirm at the API first, then verify the UI.**

Stepper labels ("Queued", "Analyzing…", "Complete", "Failed") are rendered unconditionally in the DOM. A `waitForFunction(() => body.includes('Analyzing'))` resolves immediately, before any SSE event arrives. For terminal states (done/failed), poll the API until the status is confirmed, then give the browser a short window (10s) to render it. This is faster and more reliable than a long browser-side timeout.

```javascript
// WRONG — label is always present
await page.waitForFunction(() => document.body.innerText.includes('Analyzing'));

// CORRECT — "Connecting…" is only shown when status === null (before first SSE event)
await page.waitForFunction(
  () => !document.body.innerText.includes('Connecting'),
  { timeout: 30000 },
);
```

## Long-running steps

Some steps wait for real analysis to complete (up to 2–3 minutes). If a job stalls silently (wrong token, quota, network error), the test hangs the full timeout then fails with no useful message.

For steps with `timeout >= 60000`, add a parallel poll to detect failure early:

```javascript
// Poll the API so a failed job surfaces in seconds, not after the full timeout
const pollJob = async (jobId) => {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${API}/jobs/${jobId}`).then(r => r.json()).catch(() => ({}));
    if (res.status === 'failed') throw new Error(`Job failed: ${res.error}`);
    if (res.status === 'done') return;
  }
};
```

## Cleanup

Always delete test candidates in a `finally` block so cleanup runs even on failure:
```javascript
finally {
  if (candidateId) {
    await fetch(`${API}/candidates/${candidateId}`, { method: 'DELETE' }).catch(() => {});
  }
  await browser.close();
}
```

If a previous run was force-killed, `finally` never ran and stale candidates remain. Add a pre-test cleanup step at the top of each test that deletes any leftover candidates with the test-run marker in their notes:

```javascript
// Pre-test cleanup — remove orphans from a previous killed run
const existing = await fetch(`${API}/candidates`).then(r => r.json());
for (const c of existing) {
  if (c.notes?.includes('Created by issue-N e2e test')) {
    await fetch(`${API}/candidates/${c.id}`, { method: 'DELETE' }).catch(() => {});
  }
}
```
