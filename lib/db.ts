import { Pool } from 'pg';

// Reuse one pool across hot-reloads in dev (Next.js wipes module state on reload).
const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__pgPool = pool;
}

/** Run a parameterized query and return its rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}
