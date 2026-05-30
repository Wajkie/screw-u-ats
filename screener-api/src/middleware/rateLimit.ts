import type { MiddlewareHandler } from 'hono';

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(limit: number, windowMs: number): MiddlewareHandler {
  const buckets = new Map<string, Bucket>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  return async (c, next) => {
    const forwarded = c.req.header('x-forwarded-for');
    const ip = forwarded ? (forwarded.split(',')[0]?.trim() ?? 'unknown') : 'unknown';

    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > limit) {
      c.header('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return c.json({ error: 'Rate limit exceeded — try again later' }, 429);
    }

    await next();
  };
}

export function createRateLimiterFromEnv(): MiddlewareHandler {
  const limit = Number(process.env.RATE_LIMIT ?? 100);
  const windowMs = Number(process.env.RATE_WINDOW_MS ?? 60_000);
  return createRateLimiter(limit, windowMs);
}
