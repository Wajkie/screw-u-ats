import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { wrapUntrustedContent } from "../sanitize.js";

const knowledgeDir = fileURLToPath(new URL("../../knowledge", import.meta.url));

function toSlug(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .replace(/([A-Z])/g, (c) => `-${c.toLowerCase()}`)
    .replace(/^-/, "");
}

export async function registerKnowledgeResources(server: McpServer): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(knowledgeDir)).filter((f) => f.endsWith(".md"));
  } catch {
    return;
  }
  for (const filename of files) {
    const slug = toSlug(filename);
    const name = `knowledge-${slug}`;
    const uri = `knowledge:///${slug}`;
    server.registerResource(
      name,
      uri,
      { description: `Knowledge base: ${slug}`, mimeType: "text/markdown" },
      async (resourceUri) => {
        const raw = await readFile(join(knowledgeDir, filename), "utf-8");
        const text = wrapUntrustedContent(raw);
        return {
          contents: [{ uri: resourceUri.toString(), mimeType: "text/markdown", text }],
        };
      },
    );
  }
}
