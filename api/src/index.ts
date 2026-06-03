import { createApp } from './app.js';
import { config, validateConfig } from './config.js';
import { pool } from './db/pool.js';
import { logger } from './utils/logger.js';

validateConfig();

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info('Aether API listening', { port: config.port, env: config.nodeEnv });
});

function shutdown(signal: string) {
  logger.info('Shutting down', { signal });
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
