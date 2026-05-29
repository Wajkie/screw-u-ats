import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.API_PORT ?? 4001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`screener-api listening on port ${port}`);
});
