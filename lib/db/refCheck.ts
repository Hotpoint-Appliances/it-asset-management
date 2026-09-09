import { query } from "./query";

const ASSET_REF_COLUMNS = [
  "category_id",
  "location_id",
  "department_id",
  "vendor_id",
  "condition_id",
  "status_id",
] as const;

export type AssetRefColumn = (typeof ASSET_REF_COLUMNS)[number];

export class ReferencedByAssetsError extends Error {
  constructor(public readonly column: AssetRefColumn) {
    super(`Referenced by one or more assets (${column})`);
    this.name = "ReferencedByAssetsError";
  }
}

/** Throws if any live (non-soft-deleted) asset still points at this row via `column`. Call
 * before every lookup-table DELETE so the caller gets a clean 409 instead of a raw FK violation. */
export async function assertNotReferencedByAssets(
  column: AssetRefColumn,
  id: number | string,
): Promise<void> {
  // `column` is interpolated directly into SQL below — guard against a caller bypassing the
  // AssetRefColumn type (e.g. via `as`) rather than trusting the type alone.
  if (!ASSET_REF_COLUMNS.includes(column)) {
    throw new Error(`Invalid asset reference column: ${column}`);
  }
  const result = await query(
    `SELECT 1 FROM assets WHERE deleted_at IS NULL AND ${column} = $1 LIMIT 1`,
    [id],
  );
  if ((result.rowCount ?? 0) > 0) {
    throw new ReferencedByAssetsError(column);
  }
}
