import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely, sql } from 'kysely';
import type { Database } from './schema.js';

const url = process.env.DATABASE_URL ?? 'file:./screener.db';

const db = new Kysely<Database>({
  dialect: new LibsqlDialect({ url }),
});

// SQLite disables FK enforcement by default — enable it for this connection.
await sql`PRAGMA foreign_keys = ON`.execute(db);

export { db };
