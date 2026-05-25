import "dotenv/config";

// Use required() for env vars that must be present for the server to function.
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export type Config = typeof config;

export const config = {
  serverName: optional("SERVER_NAME", "screw-u-ats"),
  githubToken: required("GITHUB_TOKEN"),
  dbType: optional("DB_TYPE", "postgres"),
  allowWrites: optional("ALLOW_WRITES", "false") === "true",
  logLevel: optional("LOG_LEVEL", "info"),
  port: process.env["PORT"] ? parseInt(process.env["PORT"], 10) : undefined,
  checkPort: process.env["CHECK_PORT"] ? parseInt(process.env["CHECK_PORT"], 10) : undefined,
  databaseUrl: process.env["DATABASE_URL"],
  redisUrl: process.env["REDIS_URL"],
  cacheTtl: {
    default: parseInt(process.env["CACHE_TTL_DEFAULT"] ?? "300", 10),
  },
  metricsInterval: parseInt(process.env["METRICS_INTERVAL"] ?? "100", 10),
  pagespeedApiKey: optional("PAGESPEED_API_KEY", ""),
  mcpSecret: process.env["MCP_SECRET"],
  maxBodyBytes: parseInt(process.env["MAX_BODY_BYTES"] ?? "1048576", 10),
  maxSessions: parseInt(process.env["MAX_SESSIONS"] ?? "100", 10),
  sessionTtlMs: parseInt(process.env["SESSION_TTL_MS"] ?? "1800000", 10),
} as const;
