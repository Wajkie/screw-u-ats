import { Pool } from "pg";

export interface AuditEntry {
  tool: string;
  inputs: Record<string, unknown>;
  outcome: "success" | "error";
  error?: string;
  actor: string;
}

export type AuditLogger = (entry: AuditEntry) => Promise<void>;

export interface AuditRow {
  id: string;
  tool_name: string;
  inputs: Record<string, unknown>;
  outcome: string;
  error_msg: string | null;
  actor: string;
  created_at: string;
}

export type AuditDashboard = (limit: number) => Promise<AuditRow[]>;

export interface AuditStore {
  log: AuditLogger;
  dashboard: AuditDashboard;
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS audit_log (
    id         BIGSERIAL PRIMARY KEY,
    tool_name  TEXT        NOT NULL,
    inputs     JSONB       NOT NULL,
    outcome    TEXT        NOT NULL,
    error_msg  TEXT,
    actor      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const INSERT_SQL = `
  INSERT INTO audit_log (tool_name, inputs, outcome, error_msg, actor)
  VALUES ($1, $2, $3, $4, $5)
`;

const noOpStore: AuditStore = {
  log: async () => {},
  dashboard: async () => [],
};

async function createPostgresAuditStore(databaseUrl: string): Promise<AuditStore> {
  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query(CREATE_TABLE_SQL);

  return {
    log: async (entry: AuditEntry) => {
      await pool.query(INSERT_SQL, [
        entry.tool,
        JSON.stringify(entry.inputs),
        entry.outcome,
        entry.error ?? null,
        entry.actor,
      ]);
    },
    dashboard: async (limit: number) => {
      const result = await pool.query<AuditRow>(
        "SELECT id, tool_name, inputs, outcome, error_msg, actor, created_at FROM audit_log ORDER BY created_at DESC LIMIT $1",
        [limit],
      );
      return result.rows;
    },
  };
}

export async function createAuditStore(
  dbType: string,
  databaseUrl: string | undefined,
): Promise<AuditStore> {
  if (dbType === "postgres" && databaseUrl) {
    return createPostgresAuditStore(databaseUrl);
  }
  return noOpStore;
}
