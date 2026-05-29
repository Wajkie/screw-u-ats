import { sql } from 'kysely';
import { db } from './client.js';

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS candidates (
      id              TEXT PRIMARY KEY,
      github_username TEXT NOT NULL UNIQUE,
      display_name    TEXT,
      graduation_date TEXT,
      notes           TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id           TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL REFERENCES candidates(id),
      status       TEXT NOT NULL DEFAULT 'pending',
      error        TEXT,
      created_at   TEXT NOT NULL,
      started_at   TEXT,
      completed_at TEXT
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id           TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL REFERENCES candidates(id),
      job_id       TEXT NOT NULL UNIQUE REFERENCES analysis_jobs(id),
      best_fit     TEXT NOT NULL,
      fit_score    INTEGER NOT NULL,
      data         TEXT NOT NULL,
      created_at   TEXT NOT NULL
    )
  `.execute(db);

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
