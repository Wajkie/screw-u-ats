import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { createAuditStore } from "./audit.js";
import { createCache } from "./cache.js";
import { startHttpServer } from "./http.js";
import { ToolRuntime, type ToolContext } from "./toolRuntime.js";
import { registerScoreCandidateTools } from "./tools/scoreCandidateTools.js";
import { registerKnowledgeResources } from "./resources/knowledgeResources.js";
import { registerKnowledgeTools } from "./tools/knowledgeTools.js";
import { createKnowledgeStore, type KnowledgeStore } from "./knowledge/search.js";
import { createObservabilityMiddleware } from "./observability.js";

const SERVER_VERSION = "0.1.0";

export const server = new McpServer({ name: config.serverName, version: SERVER_VERSION });

async function registerAllTools(runtime: ToolRuntime, knowledgeStore: KnowledgeStore): Promise<void> {
  registerScoreCandidateTools(runtime);
  await registerKnowledgeResources(runtime.server);
  registerKnowledgeTools(runtime, knowledgeStore);
}

async function buildMcpServer(
  ctx: ToolContext,
  knowledgeStore: KnowledgeStore,
  obs: ReturnType<typeof createObservabilityMiddleware>,
): Promise<McpServer> {
  const s = new McpServer({ name: config.serverName, version: SERVER_VERSION });
  obs.instrument(s);
  const runtime = new ToolRuntime(s, ctx);
  await registerAllTools(runtime, knowledgeStore);
  return s;
}

async function main() {
  const { log: auditLog, dashboard: auditDashboard } = await createAuditStore(config.dbType, config.databaseUrl);
  const knowledgeStore = await createKnowledgeStore(config.dbType, config.databaseUrl);
  const cache = createCache(config.redisUrl);

  const ctx: ToolContext = { config, auditLog, cache };
  const obs = createObservabilityMiddleware(config.metricsInterval);
  obs.instrument(server);
  const runtime = new ToolRuntime(server, ctx);
  await registerAllTools(runtime, knowledgeStore);

  const transports = config.port !== undefined ? ["stdio", "http"] : ["stdio"];
  logger.info({
    msg: "Starting MCP server",
    name: config.serverName,
    transports,
    dbType: config.dbType,
    allowWrites: config.allowWrites,
    auditEnabled: config.dbType === "postgres" && !!config.databaseUrl,
    cacheEnabled: !!config.redisUrl,
    exampleTools: runtime.exampleToolNames(),
  });

  if (config.port !== undefined) {
    await startHttpServer(
      config.port,
      () => buildMcpServer(ctx, knowledgeStore, obs),
      () => ({ status: "ok" }),
      {
        secret: config.mcpSecret,
        maxBodyBytes: config.maxBodyBytes,
        maxSessions: config.maxSessions,
        sessionTtlMs: config.sessionTtlMs,
        getAuditEntries: config.dbType === "postgres" && config.databaseUrl ? auditDashboard : undefined,
      },
    );
  }

  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);

  logger.info({ msg: "MCP server connected", transport: "stdio" });
}

main().catch((err: Error) => {
  logger.error({ msg: "Server failed to start", error: err.message });
  process.exit(1);
});
