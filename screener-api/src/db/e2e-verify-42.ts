import { writeFileSync } from 'fs';
import { sql } from 'kysely';
import { db } from './client.js';

const resultsFile = process.argv[2];
const steps: { label: string; status: 'PASS' | 'FAIL'; reason?: string }[] = [];

async function step(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    steps.push({ label, status: 'PASS' });
    console.log(`✅ ${label}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    steps.push({ label, status: 'FAIL', reason });
    console.error(`❌ ${label}: ${reason}`);
  }
}

type ColumnInfo = { name: string };

async function getColumns(table: string): Promise<string[]> {
  const rows = await sql<ColumnInfo>`PRAGMA table_info(${sql.raw(table)})`.execute(db);
  return rows.rows.map((r) => r.name);
}

await step('openings.location column exists', async () => {
  const cols = await getColumns('openings');
  if (!cols.includes('location')) throw new Error(`Missing. Got: ${cols.join(', ')}`);
});

await step('openings.work_type column exists', async () => {
  const cols = await getColumns('openings');
  if (!cols.includes('work_type')) throw new Error(`Missing. Got: ${cols.join(', ')}`);
});

await step('openings.source_url column exists', async () => {
  const cols = await getColumns('openings');
  if (!cols.includes('source_url')) throw new Error(`Missing. Got: ${cols.join(', ')}`);
});

await step('openings.external_id column exists', async () => {
  const cols = await getColumns('openings');
  if (!cols.includes('external_id')) throw new Error(`Missing. Got: ${cols.join(', ')}`);
});

await step('candidates.location column exists', async () => {
  const cols = await getColumns('candidates');
  if (!cols.includes('location')) throw new Error(`Missing. Got: ${cols.join(', ')}`);
});

await step('candidates.work_type_preference column exists', async () => {
  const cols = await getColumns('candidates');
  if (!cols.includes('work_type_preference')) throw new Error(`Missing. Got: ${cols.join(', ')}`);
});

await step('openings.external_id has UNIQUE index', async () => {
  const indexes = await sql<{ name: string; unique: number }>`PRAGMA index_list(openings)`.execute(db);
  const extIdx = indexes.rows.find((i) => i.name.includes('external_id'));
  if (!extIdx) throw new Error(`No external_id index. Got: ${indexes.rows.map((i) => i.name).join(', ')}`);
  if (!extIdx.unique) throw new Error('external_id index is not UNIQUE');
});

await step('INSERT + SELECT opening with new fields round-trips correctly', async () => {
  const { nanoid } = await import('nanoid');
  const id = nanoid();
  const extId = `e2e-42-${id}`;
  await db.insertInto('openings').values({
    id,
    title: 'E2E Test Opening',
    role_slug: 'junior-frontend',
    status: 'open',
    location: 'Stockholm',
    work_type: 'remote',
    source_url: 'https://example.com/jobs/e2e',
    external_id: extId,
    created_at: new Date().toISOString(),
  }).execute();

  const row = await db.selectFrom('openings').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
  if (row.location !== 'Stockholm') throw new Error(`location: ${row.location}`);
  if (row.work_type !== 'remote') throw new Error(`work_type: ${row.work_type}`);
  if (row.source_url !== 'https://example.com/jobs/e2e') throw new Error(`source_url: ${row.source_url}`);
  if (row.external_id !== extId) throw new Error(`external_id: ${row.external_id}`);

  await db.deleteFrom('openings').where('id', '=', id).execute();
});

await step('INSERT + SELECT candidate with location + work_type_preference round-trips correctly', async () => {
  const { nanoid } = await import('nanoid');
  const id = nanoid();
  await db.insertInto('candidates').values({
    id,
    github_username: `e2e-42-cand-${id}`,
    location: 'Göteborg',
    work_type_preference: 'hybrid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).execute();

  const row = await db.selectFrom('candidates').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
  if (row.location !== 'Göteborg') throw new Error(`location: ${row.location}`);
  if (row.work_type_preference !== 'hybrid') throw new Error(`work_type_preference: ${row.work_type_preference}`);

  await db.deleteFrom('candidates').where('id', '=', id).execute();
});

if (resultsFile) writeFileSync(resultsFile, JSON.stringify(steps, null, 2));

const failed = steps.filter((s) => s.status === 'FAIL').length;
process.exit(failed > 0 ? 1 : 0);
