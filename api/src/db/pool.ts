import pg from 'pg';
import { config } from '../config.js';

const useSsl =
  config.isProduction ||
  config.databaseUrl.includes('sslmode=require') ||
  config.databaseUrl.includes('postgres.database.azure.com');

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  ssl: useSsl ? { rejectUnauthorized: true } : undefined,
});
