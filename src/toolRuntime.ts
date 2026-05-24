import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import type { Config } from "./config.js";
import type { AuditLogger } from "./audit.js";
import type { CacheClient } from "./cache.js";
import { ok, toErrorContent } from "./internal/response.js";
import { writeDenied } from "./internal/writeGate.js";

export interface ToolContext {
  config: Config;
  auditLog: AuditLogger;
  cache: CacheClient;
}

type InferInput<T extends ZodRawShape> = {
  [K in keyof T]: z.infer<T[K]>;
};

export type SideEffect = "none" | "read" | "write";

export interface ToolDefinition<TSchema extends ZodRawShape> {
  name: string;
  description: string;
  sideEffect: SideEffect;
  example?: true;
  inputSchema: TSchema;
  handler: (input: InferInput<TSchema>, ctx: ToolContext) => Promise<unknown>;
}

export class ToolRuntime {
  readonly server: McpServer;
  private readonly _ctx: ToolContext;
  private readonly _exampleNames: string[] = [];

  constructor(server: McpServer, ctx: ToolContext) {
    this.server = server;
    this._ctx = ctx;
  }

  register<TSchema extends ZodRawShape>(def: ToolDefinition<TSchema>): void {
    if (def.example) this._exampleNames.push(def.name);
    const ctx = this._ctx;
    const cb = async (input: unknown): Promise<CallToolResult> => {
      if (def.sideEffect === "write" && !ctx.config.allowWrites) {
        return writeDenied();
      }
      try {
        const result = await def.handler(input as InferInput<TSchema>, ctx);
        return ok(result);
      } catch (err) {
        return toErrorContent(err);
      }
    };
    this.server.registerTool(
      def.name,
      { description: def.description, inputSchema: def.inputSchema },
      cb as unknown as ToolCallback<TSchema>,
    );
  }

  exampleToolNames(): readonly string[] {
    return this._exampleNames;
  }
}
