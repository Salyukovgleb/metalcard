import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

type GlobalWithPool = typeof globalThis & {
  __metalcardsAdminPool?: Pool;
};

function asBool(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}

function asInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createPool(): Pool {
  const useSsl = asBool(process.env.DB_SSL);

  return new Pool({
    host: (process.env.DB_HOST ?? "db").trim(),
    port: asInt(process.env.DB_PORT, 5432),
    database: (process.env.DB_NAME ?? "metalcard").trim(),
    user: (process.env.DB_USER ?? "metalcard").trim(),
    password: process.env.DB_PASSWORD ?? "metalcard",
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: asInt(process.env.DB_POOL_MAX, 10),
    idleTimeoutMillis: asInt(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
    connectionTimeoutMillis: asInt(process.env.DB_CONNECT_TIMEOUT_MS, 10_000),
  });
}

const globalWithPool = globalThis as GlobalWithPool;
const pool = globalWithPool.__metalcardsAdminPool ?? createPool();

if (!globalWithPool.__metalcardsAdminPool) {
  globalWithPool.__metalcardsAdminPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params as unknown[]);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
