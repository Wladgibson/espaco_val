import { Pool, type QueryResultRow } from 'pg';

// Singleton pool — sobrevive a HMR no dev do Next.js via global.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (global.__pgPool) return global.__pgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida no .env.local');
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  if (process.env.NODE_ENV !== 'production') {
    global.__pgPool = pool;
  }

  return pool;
}

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) =>
    getPool().query<T>(text, params as never[]),
  one: async <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => {
    const r = await getPool().query<T>(text, params as never[]);
    return r.rows[0] ?? null;
  },
  many: async <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => {
    const r = await getPool().query<T>(text, params as never[]);
    return r.rows;
  },
};
