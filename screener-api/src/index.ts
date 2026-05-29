import 'dotenv/config';
import { startApiServer } from './apiServer.js';

const port = Number(process.env.API_PORT ?? 4001);
startApiServer(port).catch((err) => {
  console.error('Failed to start screener-api:', err);
  process.exit(1);
});
