import { z } from "zod";
import type { KnowledgeStore } from "../knowledge/search.js";
import type { ToolRuntime } from "../toolRuntime.js";

export function registerKnowledgeTools(runtime: ToolRuntime, store: KnowledgeStore): void {
  runtime.register({
    name: "search_knowledge",
    description:
      "Search the knowledge base for relevant documentation. Use before asking about project conventions, architecture, or runbooks — returns ranked excerpts with source file and section.",
    sideEffect: "read",
    inputSchema: { query: z.string().describe("Search terms") },
    handler: async ({ query }) => store.search(query),
  });
}
