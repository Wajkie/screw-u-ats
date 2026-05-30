import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { candidates } from './candidates/candidates.routes.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { createBodyLimitFromEnv } from './middleware/bodyLimit.js';
import { createRateLimiterFromEnv } from './middleware/rateLimit.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { AppError } from './errors.js';
import type { AddressInfo } from 'node:net';

export function createApiApp(): Hono {
  const app = new Hono();

  app.use('*', secureHeaders());
  app.use('*', createCorsMiddleware());
  app.use('*', createBodyLimitFromEnv());
  app.use('*', createRateLimiterFromEnv());
  app.use('*', createAuthMiddleware());

  app.route('/candidates', candidates);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.statusCode as Parameters<typeof c.json>[1]);
    }
    console.error(err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}

export async function startApiServer(port: number): Promise<void> {
  const app = createApiApp();
  await new Promise<void>((resolve, reject) => {
    const server = serve({ fetch: app.fetch, port }, (_info: AddressInfo) => resolve());
    server.once('error', reject);
  });
  console.log(`screener-api listening on port ${port}`);
}
