import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './schema.js';

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = databaseUrl?.startsWith('postgres');

function createDb(): Kysely<Database> {
  if (isPostgres) {
    return new Kysely<Database>({
      dialect: new PostgresDialect({ pool: new Pool({ connectionString: databaseUrl }) }),
    });
  }
  return new Kysely<Database>({
    dialect: new LibsqlDialect({ url: databaseUrl ?? 'file:./screener.db' }),
  });
}

const db = createDb();

if (!isPostgres) {
  // SQLite disables FK enforcement by default — enable it for this connection.
  await sql`PRAGMA foreign_keys = ON`.execute(db);
}

export { db };
