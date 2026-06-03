import 'dotenv/config';
import { migrate } from './db/migrate.js';
import { startApiServer } from './apiServer.js';

const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4001);

migrate()
  .then(() => startApiServer(port))
  .catch((err: unknown) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
