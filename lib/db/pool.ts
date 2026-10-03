import { Pool } from "pg";

const globalForPool = globalThis as unknown as { pgPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  // One pool per process, so a PM2 cluster opens up to (instances x max) connections. Keep that
  // below Postgres's max_connections (see docs/deployment.md). Unset/invalid = pg's default, 10.
  const max = Number(process.env.PG_POOL_MAX);
  return new Pool({
    connectionString,
    ...(Number.isInteger(max) && max > 0 ? { max } : {}),
  });
}

// Reused across hot reloads in dev so we don't leak connections on every edit.
export const pool = globalForPool.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPool.pgPool = pool;
}
