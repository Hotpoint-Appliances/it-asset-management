import { query } from "./query";
import { assertNotReferencedByAssets } from "./refCheck";
import type { AssetStatus, AssetStatusInput } from "@/types/assetStatus";

interface AssetStatusRow {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

function mapAssetStatus(row: AssetStatusRow): AssetStatus {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = `id, name, sort_order, created_at`;

export async function listAssetStatuses(): Promise<AssetStatus[]> {
  const result = await query<AssetStatusRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_statuses ORDER BY sort_order, name`,
  );
  return result.rows.map(mapAssetStatus);
}

export async function createAssetStatus(
  input: AssetStatusInput,
): Promise<AssetStatus> {
  const result = await query<AssetStatusRow>(
    `INSERT INTO asset_statuses (name, sort_order) VALUES ($1, $2) RETURNING ${SELECT_COLUMNS}`,
    [input.name, input.sortOrder],
  );
  return mapAssetStatus(result.rows[0]);
}

export async function updateAssetStatus(
  id: number,
  input: AssetStatusInput,
): Promise<AssetStatus | null> {
  const result = await query<AssetStatusRow>(
    `UPDATE asset_statuses SET name = $2, sort_order = $3 WHERE id = $1 RETURNING ${SELECT_COLUMNS}`,
    [id, input.name, input.sortOrder],
  );
  return result.rows[0] ? mapAssetStatus(result.rows[0]) : null;
}

export async function deleteAssetStatus(id: number): Promise<boolean> {
  await assertNotReferencedByAssets("status_id", id);
  const result = await query(`DELETE FROM asset_statuses WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
