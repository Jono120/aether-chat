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

/** Anything that can run a query: the shared pool or a checked-out client. */
export type Queryable = pg.Pool | pg.PoolClient;

/**
 * Runs `fn` on a single checked-out client inside BEGIN/COMMIT, rolling back
 * on any error and always releasing the client. The standard pattern for any
 * flow with more than one write.
 */
export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
