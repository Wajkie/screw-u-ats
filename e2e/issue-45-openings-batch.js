/**
 * E2E: issue #45 — API: POST /openings/batch bulk ingest endpoint
 * Covers: create-only, upsert on external_id, counts, 400 on invalid input.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(__dirname, 'results'), { recursive: true });
const RESULTS_FILE = path.join(__dirname, 'results/issue-45-openings-batch.md');

const API = 'http://localhost:4001';
const TAG = 'e2e-issue-45';

const steps = [];

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
      s.reason ? `> ${s.reason}` : '',
    ].filter(Boolean)),
  ];
  writeFileSync(RESULTS_FILE, lines.join('\n\n'));
  return verdict;
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function json(method, path, body) {
  return api(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const createdIds = [];

try {
  // Cleanup: remove any openings left from a previous failed run
  const { body: existing } = await api('/openings');
  for (const o of existing ?? []) {
    if (o.title?.includes(TAG)) {
      await api(`/openings/${o.id}`, { method: 'DELETE' }).catch(() => {});
    }
  }

  let firstBatchIds = [];

  await step('POST /openings/batch creates multiple openings in one request', async () => {
    const { status, body } = await json('POST', '/openings/batch', {
      openings: [
        { title: `Opening A [${TAG}]`, role_slug: 'junior-frontend', external_id: `${TAG}-A` },
        { title: `Opening B [${TAG}]`, role_slug: 'junior-backend', external_id: `${TAG}-B` },
      ],
    });
    if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(body)}`);
    if (body.created !== 2) throw new Error(`Expected created=2, got ${body.created}`);
    if (body.updated !== 0) throw new Error(`Expected updated=0, got ${body.updated}`);
    if (!Array.isArray(body.openings) || body.openings.length !== 2) {
      throw new Error(`Expected openings array of length 2, got ${JSON.stringify(body.openings)}`);
    }
    firstBatchIds = body.openings.map(o => o.id);
    createdIds.push(...firstBatchIds);
  });

  await step('Items with a matching external_id are updated, not duplicated', async () => {
    const { status, body } = await json('POST', '/openings/batch', {
      openings: [
        { title: `Opening A — updated [${TAG}]`, role_slug: 'junior-frontend', external_id: `${TAG}-A` },
        { title: `Opening C [${TAG}]`, role_slug: 'junior-fullstack', external_id: `${TAG}-C` },
      ],
    });
    if (status !== 201) throw new Error(`Expected 201, got ${status}: ${JSON.stringify(body)}`);
    if (body.created !== 1) throw new Error(`Expected created=1, got ${body.created}`);
    if (body.updated !== 1) throw new Error(`Expected updated=1, got ${body.updated}`);

    // Verify no duplicate: list openings and count those matching TAG-A external_id
    const { body: list } = await api('/openings');
    const tagAMatches = list.filter(o => o.external_id === `${TAG}-A`);
    if (tagAMatches.length !== 1) throw new Error(`Expected 1 opening with external_id TAG-A, got ${tagAMatches.length}`);
    if (!tagAMatches[0].title.includes('updated')) throw new Error('Opening A title was not updated');

    const newIds = body.openings.map(o => o.id);
    for (const id of newIds) if (!createdIds.includes(id)) createdIds.push(id);
  });

  await step('Items without external_id always create new openings', async () => {
    const { status, body } = await json('POST', '/openings/batch', {
      openings: [
        { title: `Opening no-ext-id 1 [${TAG}]`, role_slug: 'junior-frontend' },
        { title: `Opening no-ext-id 2 [${TAG}]`, role_slug: 'junior-frontend' },
      ],
    });
    if (status !== 201) throw new Error(`Expected 201, got ${status}`);
    if (body.created !== 2) throw new Error(`Expected created=2, got ${body.created}`);
    if (body.updated !== 0) throw new Error(`Expected updated=0, got ${body.updated}`);
    for (const id of body.openings.map(o => o.id)) createdIds.push(id);
  });

  await step('Response includes created, updated counts and full openings array', async () => {
    const { body } = await json('POST', '/openings/batch', {
      openings: [{ title: `Shape check [${TAG}]`, role_slug: 'junior-backend' }],
    });
    const required = ['created', 'updated', 'openings'];
    for (const f of required) {
      if (!(f in body)) throw new Error(`Missing field: ${f}`);
    }
    if (!Array.isArray(body.openings)) throw new Error('openings must be an array');
    const opening = body.openings[0];
    const openingFields = ['id', 'title', 'role_slug', 'status', 'created_at'];
    for (const f of openingFields) {
      if (!(f in opening)) throw new Error(`Opening missing field: ${f}`);
    }
    createdIds.push(opening.id);
  });

  await step('Invalid item in batch returns 400 with error detail', async () => {
    const { status, body } = await json('POST', '/openings/batch', {
      openings: [
        { title: `Valid [${TAG}]`, role_slug: 'frontend-developer' },
        { title: '', role_slug: 'frontend-developer' }, // title too short
      ],
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (!body?.error) throw new Error('Expected error field in body');
  });

  await step('POST /openings/batch with empty array returns 400', async () => {
    const { status, body } = await json('POST', '/openings/batch', { openings: [] });
    if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(body)}`);
  });

} finally {
  for (const id of createdIds) {
    await api(`/openings/${id}`, { method: 'DELETE' }).catch(() => {});
  }
  console.log(`Cleaned up ${createdIds.length} test openings`);

  const verdict = writeResults('Issue #45 — POST /openings/batch bulk ingest');
  console.log(`\nVerdict: ${verdict}`);
  process.exit(verdict === 'PASS' ? 0 : 1);
}
