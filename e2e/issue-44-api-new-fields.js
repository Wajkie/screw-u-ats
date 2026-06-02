/**
 * E2E: issue #44 — API: surface location, work_type, source_url on openings + candidates
 * Pure fetch script — no Playwright needed (API-only issue).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = path.join(__dirname, 'results/issue-44-api-new-fields.md');
mkdirSync(path.join(__dirname, 'results'), { recursive: true });

const API = 'http://localhost:4001';

const steps = [];
let candidateId;
let openingId;

async function step(label, fn) {
  try {
    await fn();
    steps.push({ label, status: 'PASS' });
    console.log(`✅ ${label}`);
  } catch (e) {
    steps.push({ label, status: 'FAIL', reason: String(e.message ?? e) });
    console.error(`❌ ${label}: ${e.message ?? e}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function cleanup() {
  try {
    if (candidateId) await fetch(`${API}/candidates/${candidateId}`, { method: 'DELETE' });
    if (openingId) await fetch(`${API}/openings/${openingId}`, { method: 'DELETE' });
  } catch {}
}

async function precleaning() {
  try {
    const list = await fetch(`${API}/candidates`).then((r) => r.json()).catch(() => []);
    for (const c of list) {
      if (c.github_username?.startsWith('e2e-44-')) {
        await fetch(`${API}/candidates/${c.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
    const openings = await fetch(`${API}/openings`).then((r) => r.json()).catch(() => []);
    for (const o of openings) {
      if (o.title?.includes('[e2e-44]')) {
        await fetch(`${API}/openings/${o.id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
  } catch {}
}

await precleaning();

// ── Candidates ───────────────────────────────────────────────────────────────

await step('POST /candidates with location + work_type_preference persists both fields', async () => {
  const res = await fetch(`${API}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      github_username: 'e2e-44-user',
      location: 'Stockholm, Sweden',
      work_type_preference: 'hybrid',
    }),
  });
  assert(res.status === 201, `expected 201, got ${res.status}`);
  const body = await res.json();
  assert(body.location === 'Stockholm, Sweden', `location mismatch: ${body.location}`);
  assert(body.work_type_preference === 'hybrid', `work_type_preference mismatch: ${body.work_type_preference}`);
  candidateId = body.id;
});

await step('GET /candidates/:id returns location + work_type_preference', async () => {
  const res = await fetch(`${API}/candidates/${candidateId}`);
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const body = await res.json();
  assert(body.location === 'Stockholm, Sweden', `location mismatch: ${body.location}`);
  assert(body.work_type_preference === 'hybrid', `work_type_preference mismatch: ${body.work_type_preference}`);
});

await step('GET /candidates list includes location + work_type_preference', async () => {
  const res = await fetch(`${API}/candidates`);
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const list = await res.json();
  const c = list.find((x) => x.id === candidateId);
  assert(c, 'created candidate not found in list');
  assert(c.location === 'Stockholm, Sweden', `location missing from list: ${c.location}`);
  assert(c.work_type_preference === 'hybrid', `work_type_preference missing from list`);
});

await step('PATCH /candidates/:id updates location + work_type_preference', async () => {
  const res = await fetch(`${API}/candidates/${candidateId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: 'Gothenburg, Sweden', work_type_preference: 'remote' }),
  });
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const body = await res.json();
  assert(body.location === 'Gothenburg, Sweden', `location not updated: ${body.location}`);
  assert(body.work_type_preference === 'remote', `work_type_preference not updated`);
});

await step('POST /candidates with invalid work_type_preference returns 400', async () => {
  const res = await fetch(`${API}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ github_username: 'e2e-44-bad', work_type_preference: 'fulltime' }),
  });
  assert(res.status === 400, `expected 400, got ${res.status}`);
});

await step('POST /candidates omitting new fields still works (all nullable)', async () => {
  const res = await fetch(`${API}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ github_username: 'e2e-44-minimal' }),
  });
  assert(res.status === 201, `expected 201, got ${res.status}`);
  const body = await res.json();
  assert(body.location === null, `expected null location, got ${body.location}`);
  assert(body.work_type_preference === null, `expected null work_type_preference`);
  // clean up the extra candidate immediately
  await fetch(`${API}/candidates/${body.id}`, { method: 'DELETE' });
});

// ── Openings ──────────────────────────────────────────────────────────────────

await step('POST /openings with location + work_type + source_url persists all three', async () => {
  const res = await fetch(`${API}/openings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '[e2e-44] Test Opening',
      role_slug: 'junior-frontend',
      location: 'Remote, EU',
      work_type: 'remote',
      source_url: 'https://example.com/jobs/1',
    }),
  });
  assert(res.status === 201, `expected 201, got ${res.status}`);
  const body = await res.json();
  assert(body.location === 'Remote, EU', `location mismatch: ${body.location}`);
  assert(body.work_type === 'remote', `work_type mismatch: ${body.work_type}`);
  assert(body.source_url === 'https://example.com/jobs/1', `source_url mismatch: ${body.source_url}`);
  openingId = body.id;
});

await step('GET /openings/:id returns location + work_type + source_url', async () => {
  const res = await fetch(`${API}/openings/${openingId}`);
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const body = await res.json();
  assert(body.location === 'Remote, EU', `location mismatch`);
  assert(body.work_type === 'remote', `work_type mismatch`);
  assert(body.source_url === 'https://example.com/jobs/1', `source_url mismatch`);
});

await step('GET /openings list includes location + work_type + source_url', async () => {
  const res = await fetch(`${API}/openings`);
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const list = await res.json();
  const o = list.find((x) => x.id === openingId);
  assert(o, 'created opening not found in list');
  assert(o.location === 'Remote, EU', `location missing from list`);
  assert(o.work_type === 'remote', `work_type missing from list`);
  assert(o.source_url === 'https://example.com/jobs/1', `source_url missing from list`);
});

await step('PATCH /openings/:id updates location + work_type + source_url', async () => {
  const res = await fetch(`${API}/openings/${openingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'Stockholm, Sweden',
      work_type: 'hybrid',
      source_url: 'https://example.com/jobs/2',
    }),
  });
  assert(res.status === 200, `expected 200, got ${res.status}`);
  const body = await res.json();
  assert(body.location === 'Stockholm, Sweden', `location not updated`);
  assert(body.work_type === 'hybrid', `work_type not updated`);
  assert(body.source_url === 'https://example.com/jobs/2', `source_url not updated`);
});

await step('POST /openings with invalid work_type returns 400', async () => {
  const res = await fetch(`${API}/openings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '[e2e-44] bad', role_slug: 'junior-frontend', work_type: 'contract' }),
  });
  assert(res.status === 400, `expected 400, got ${res.status}`);
});

await step('POST /openings omitting new fields still works (all nullable)', async () => {
  const res = await fetch(`${API}/openings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '[e2e-44] minimal', role_slug: 'junior-frontend' }),
  });
  assert(res.status === 201, `expected 201, got ${res.status}`);
  const body = await res.json();
  assert(body.location === null, `expected null location`);
  assert(body.work_type === null, `expected null work_type`);
  assert(body.source_url === null, `expected null source_url`);
  await fetch(`${API}/openings/${body.id}`, { method: 'DELETE' });
});

// ── Cleanup + results ─────────────────────────────────────────────────────────

await cleanup();

const passed = steps.filter((s) => s.status === 'PASS').length;
const failed = steps.filter((s) => s.status === 'FAIL').length;

const md = [
  '# Issue #44 E2E Results — API: surface location, work_type, source_url',
  '',
  `**${passed}/${steps.length} passed** — ${new Date().toISOString()}`,
  '',
  '## Steps',
  '',
  ...steps.map((s) =>
    s.status === 'PASS'
      ? `- [x] **${s.label}**`
      : `- [ ] **${s.label}**\n  > ${s.reason}`,
  ),
].join('\n');

writeFileSync(RESULTS_FILE, md);
console.log(`\n${passed}/${steps.length} passed`);
if (failed > 0) process.exit(1);
