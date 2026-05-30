import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { candidates } from './candidates/candidates.routes.js';
import type { AddressInfo } from 'node:net';

export function createApiApp(): Hono {
  const app = new Hono();
  app.use('*', cors());

  app.route('/candidates', candidates);

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
