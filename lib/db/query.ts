import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "./pool";

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Postgres unique_violation (23505) — e.g. a duplicate email on `users`. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "23505"
  );
}

/** Postgres foreign_key_violation (23503) — e.g. an asset referencing a category/vendor id
 * that doesn't exist. Lets route handlers return a clean 400 instead of a raw 500. */
export function isForeignKeyViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "23503"
  );
}
