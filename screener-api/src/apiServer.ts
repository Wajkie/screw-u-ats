import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { candidates } from './candidates/candidates.routes.js';
import { jobs } from './jobs/jobs.routes.js';
import { reports } from './reports/reports.routes.js';
import { roles } from './roles/roles.routes.js';
import { openings } from './openings/openings.routes.js';
import { sourcing } from './sourcing/sourcing.routes.js';
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

  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.get('/features', (c) => c.json({ lighthouse: !!process.env.PAGESPEED_API_KEY }));

  app.route('/candidates', candidates);
  app.route('/jobs', jobs);
  app.route('/reports', reports);
  app.route('/roles', roles);
  app.route('/openings', openings);
  app.route('/', sourcing);

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.statusCode as Parameters<typeof c.json>[1]);
    }
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
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
