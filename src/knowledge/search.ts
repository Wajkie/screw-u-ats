import { Pool } from "pg";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { wrapUntrustedContent } from "../sanitize.js";

export interface SearchResult {
  file: string;
  section: string;
  excerpt: string;
  score: number;
}

export interface KnowledgeStore {
  search(query: string): Promise<{ results: SearchResult[] } | { error: string }>;
}

const knowledgeDir = fileURLToPath(new URL("../../knowledge", import.meta.url));

const SETUP_SQL = `
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id         BIGSERIAL PRIMARY KEY,
    file       TEXT NOT NULL,
    section    TEXT NOT NULL,
    content    TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS knowledge_chunks_content_trgm
    ON knowledge_chunks USING GIN (content gin_trgm_ops);
  CREATE TABLE IF NOT EXISTS knowledge_files (
    file         TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    indexed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

const SEARCH_SQL = `
  SELECT file, section,
    CASE WHEN length(content) > 400 THEN left(content, 400) || '...' ELSE content END AS excerpt,
    word_similarity($1, content) AS score
  FROM knowledge_chunks
  WHERE $1 <% content
  ORDER BY score DESC
  LIMIT 10
`;

export function chunkMarkdown(
  filename: string,
  content: string,
): { file: string; section: string; content: string }[] {
  const file = filename.replace(/\.md$/, "");
  const lines = content.split("\n");
  const chunks: { file: string; section: string; content: string }[] = [];

  let section = "Introduction";
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text.length >= 10) chunks.push({ file, section, content: text });
    buffer = [];
  };

  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.+)/);
    if (m) {
      flush();
      section = m[1].trim();
      buffer = [line];
    } else {
      buffer.push(line);
    }
  }
  flush();

  return chunks;
}

async function indexFiles(pool: Pool): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(knowledgeDir)).filter((f) => f.endsWith(".md"));
  } catch {
    return;
  }
  for (const filename of files) {
    const file = filename.replace(/\.md$/, "");
    const content = await readFile(join(knowledgeDir, filename), "utf-8");
    const hash = createHash("sha256").update(content).digest("hex");

    const { rows } = await pool.query<{ content_hash: string }>(
      "SELECT content_hash FROM knowledge_files WHERE file = $1",
      [file],
    );
    if (rows[0]?.content_hash === hash) continue;

    const chunks = chunkMarkdown(filename, content);
    await pool.query("DELETE FROM knowledge_chunks WHERE file = $1", [file]);
    for (const chunk of chunks) {
      await pool.query(
        "INSERT INTO knowledge_chunks (file, section, content) VALUES ($1, $2, $3)",
        [chunk.file, chunk.section, chunk.content],
      );
    }
    await pool.query(
      `INSERT INTO knowledge_files (file, content_hash, indexed_at)
       VALUES ($1, $2, now())
       ON CONFLICT (file) DO UPDATE SET content_hash = EXCLUDED.content_hash, indexed_at = now()`,
      [file, hash],
    );
  }
}

async function createPostgresKnowledgeStore(databaseUrl: string): Promise<KnowledgeStore> {
  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query(SETUP_SQL);
  await indexFiles(pool);

  return {
    search: async (query: string) => {
      const { rows } = await pool.query<{
        file: string;
        section: string;
        excerpt: string;
        score: number;
      }>(SEARCH_SQL, [query]);
      return {
        results: rows.map((r) => ({
          file: r.file,
          section: r.section,
          excerpt: wrapUntrustedContent(r.excerpt),
          score: Math.round(r.score * 100) / 100,
        })),
      };
    },
  };
}

const noOpStore: KnowledgeStore = {
  search: async () => ({
    error:
      "Knowledge search is not available for this database type. Set DB_TYPE=postgres and DATABASE_URL to enable it.",
  }),
};

export async function createKnowledgeStore(
  dbType: string,
  databaseUrl: string | undefined,
): Promise<KnowledgeStore> {
  if (dbType === "postgres" && databaseUrl) {
    return createPostgresKnowledgeStore(databaseUrl);
  }
  return noOpStore;
}
