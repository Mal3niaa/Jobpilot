import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

/**
 * Shared connection pool.
 * Postgres connections are expensive to open — a pool keeps a few ready.
 *
 * `pg` reads DATABASE_URL from the connectionString option.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Reasonable defaults for a small app.
  max: 10,                    // max clients in pool
  idleTimeoutMillis: 30_000,  // close idle clients after 30s
  connectionTimeoutMillis: 5_000, // fail fast if DB unreachable
});

/**
 * Small helper: run a query with params, log slow queries in dev.
 * Using a wrapper (instead of `pool.query` directly) keeps services clean.
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (env.NODE_ENV === 'development' && duration > 100) {
    console.warn(`[slow query] ${duration}ms — ${text.slice(0, 80)}`);
  }

  return result;
}

/**
 * Verify DB connectivity on startup.
 * Called from server.js so we fail fast if Postgres is down.
 */
export async function testConnection() {
  const result = await pool.query('SELECT NOW() AS now');
  return result.rows[0].now;
}