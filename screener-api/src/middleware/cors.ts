import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';

// CORS_ORIGIN: comma-separated list of allowed origins, or * for open.
// Defaults to * so local dev works without configuration.
export function createCorsMiddleware(): MiddlewareHandler {
  const raw = process.env.CORS_ORIGIN ?? '*';

  if (raw === '*') {
    return cors();
  }

  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return cors({ origin: origins });
}
