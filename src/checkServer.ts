import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { scoreAllRoles } from "./tools/scoreAllRoles.js";
import { logger } from "./logger.js";
import type { AddressInfo } from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const rolesDir = resolve(__dirname, "../knowledge/roles");

const GITHUB_NAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export function createCheckApp(githubToken: string): Hono {
  const app = new Hono();

  app.use("*", cors());

  app.get("/check/:githubName", async (c) => {
    const githubName = c.req.param("githubName");

    if (!GITHUB_NAME_RE.test(githubName)) {
      return c.json({ error: "Invalid GitHub username" }, 400);
    }

    const graduationParam = c.req.query("graduation_date");
    let gradDate: Date | null = null;
    if (graduationParam) {
      gradDate = new Date(graduationParam);
      if (isNaN(gradDate.getTime())) {
        return c.json({ error: "Invalid graduation_date — expected YYYY-MM-DD" }, 400);
      }
    }

    try {
      const result = await scoreAllRoles(githubName, githubToken, rolesDir, gradDate);
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      logger.error({ msg: "check endpoint error", github: githubName, error: message });
      return c.json({ error: message }, 500);
    }
  });

  return app;
}

export async function startCheckServer(port: number, githubToken: string): Promise<void> {
  const app = createCheckApp(githubToken);
  await new Promise<void>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port }, (_info: AddressInfo) => resolve());
    server.once("error", reject);
  });
  logger.info({ msg: "Check HTTP server listening", port });
}
