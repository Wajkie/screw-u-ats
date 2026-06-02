import { sql } from 'kysely';
import { db } from './client.js';

async function migrate() {
  await db.schema
    .createTable('candidates')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('github_username', 'text', (col) => col.notNull().unique())
    .addColumn('display_name', 'text')
    .addColumn('graduation_date', 'text')
    .addColumn('notes', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('analysis_jobs')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('candidate_id', 'text', (col) => col.notNull().references('candidates.id'))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('error', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('started_at', 'text')
    .addColumn('completed_at', 'text')
    .execute();

  await db.schema
    .createTable('reports')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('candidate_id', 'text', (col) => col.notNull().references('candidates.id'))
    .addColumn('job_id', 'text', (col) => col.notNull().unique().references('analysis_jobs.id'))
    .addColumn('best_fit', 'text', (col) => col.notNull())
    .addColumn('fit_score', 'integer', (col) => col.notNull())
    .addColumn('data', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('openings')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('role_slug', 'text', (col) => col.notNull())
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('open'))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createTable('sourcing_jobs')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('opening_id', 'text', (col) => col.notNull().references('openings.id'))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('pending'))
    .addColumn('error', 'text')
    .addColumn('usernames_found', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('usernames_scored', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('started_at', 'text')
    .addColumn('completed_at', 'text')
    .execute();

  // Postgres supports IF NOT EXISTS; SQLite does not — swallow duplicate-column errors.
  const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');
  if (isPostgres) {
    await sql`ALTER TABLE candidates ADD COLUMN IF NOT EXISTS sourced_from_opening_id text REFERENCES openings(id)`.execute(db);
  } else {
    try {
      await sql`ALTER TABLE candidates ADD COLUMN sourced_from_opening_id text REFERENCES openings(id)`.execute(db);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('duplicate column')) throw err;
    }
  }

  console.log('Migration complete.');
}

migrate().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
