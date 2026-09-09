import { query } from "./query";
import { assertNotReferencedByAssets } from "./refCheck";
import type { AssetCondition, AssetConditionInput } from "@/types/assetCondition";

interface AssetConditionRow {
  id: number;
  name: string;
  sort_order: number;
  created_at: string;
}

function mapAssetCondition(row: AssetConditionRow): AssetCondition {
  return { id: row.id, name: row.name, sortOrder: row.sort_order, createdAt: row.created_at };
}

const SELECT_COLUMNS = `id, name, sort_order, created_at`;

export async function listAssetConditions(): Promise<AssetCondition[]> {
  const result = await query<AssetConditionRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_conditions ORDER BY sort_order, name`,
  );
  return result.rows.map(mapAssetCondition);
}

export async function createAssetCondition(
  input: AssetConditionInput,
): Promise<AssetCondition> {
  const result = await query<AssetConditionRow>(
    `INSERT INTO asset_conditions (name, sort_order) VALUES ($1, $2) RETURNING ${SELECT_COLUMNS}`,
    [input.name, input.sortOrder],
  );
  return mapAssetCondition(result.rows[0]);
}

export async function updateAssetCondition(
  id: number,
  input: AssetConditionInput,
): Promise<AssetCondition | null> {
  const result = await query<AssetConditionRow>(
    `UPDATE asset_conditions SET name = $2, sort_order = $3 WHERE id = $1 RETURNING ${SELECT_COLUMNS}`,
    [id, input.name, input.sortOrder],
  );
  return result.rows[0] ? mapAssetCondition(result.rows[0]) : null;
}

export async function deleteAssetCondition(id: number): Promise<boolean> {
  await assertNotReferencedByAssets("condition_id", id);
  const result = await query(`DELETE FROM asset_conditions WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
