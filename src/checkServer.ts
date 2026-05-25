import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { scoreAllRoles } from "./tools/scoreAllRoles.js";
import { logger } from "./logger.js";
import type { AddressInfo } from "node:net";
import type { MiddlewareHandler } from "hono";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const rolesDir = resolve(__dirname, "../knowledge/roles");

const GITHUB_NAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

interface RateBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(limit: number, windowMs: number): MiddlewareHandler {
  const buckets = new Map<string, RateBucket>();

  // Evict stale entries every window to prevent unbounded growth
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  return async (c, next) => {
    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";

    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, limit - bucket.count);
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > limit) {
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Rate limit exceeded — try again later" }, 429);
    }

    await next();
  };
}

export function createCheckApp(githubToken: string, rateLimit = 20, rateWindowMs = 60_000): Hono {
  const app = new Hono();

  app.use("*", cors());
  app.use("/check/*", createRateLimiter(rateLimit, rateWindowMs));

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

export async function startCheckServer(
  port: number,
  githubToken: string,
  rateLimit: number,
  rateWindowMs: number,
): Promise<void> {
  const app = createCheckApp(githubToken, rateLimit, rateWindowMs);
  await new Promise<void>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port }, (_info: AddressInfo) => resolve());
    server.once("error", reject);
  });
  logger.info({ msg: "Check HTTP server listening", port, rateLimit, rateWindowMs });
}
