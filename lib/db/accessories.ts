import { query, isForeignKeyViolation } from "./query";
import { toIsoString } from "./dates";
import type { Accessory, AccessoryInput } from "@/types/accessory";

interface AccessoryRow {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  asset_count: string;
  created_at: Date | string;
}

function mapAccessory(row: AccessoryRow): Accessory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    assetCount: Number(row.asset_count),
    createdAt: toIsoString(row.created_at)!,
  };
}

const SELECT_COLUMNS = `x.id, x.name, x.description, x.is_active, x.sort_order, x.created_at,
  (SELECT count(*) FROM asset_accessories aa JOIN assets a ON a.id = aa.asset_id
   WHERE aa.accessory_id = x.id AND a.deleted_at IS NULL) AS asset_count`;

export class AccessoryInUseError extends Error {
  constructor() {
    super("Accessory is attached to one or more assets");
    this.name = "AccessoryInUseError";
  }
}

/** The whole catalog (it's a short admin-managed list), or only active entries for pickers. */
export async function listAccessories({
  activeOnly = false,
}: { activeOnly?: boolean } = {}): Promise<Accessory[]> {
  const result = await query<AccessoryRow>(
    `SELECT ${SELECT_COLUMNS} FROM accessories x
     WHERE ($1::boolean IS FALSE OR x.is_active)
     ORDER BY x.sort_order, x.name`,
    [activeOnly],
  );
  return result.rows.map(mapAccessory);
}

export async function createAccessory(
  input: AccessoryInput,
): Promise<Accessory> {
  const result = await query<{ id: number }>(
    `INSERT INTO accessories (name, description, is_active, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.name, input.description, input.isActive, input.sortOrder],
  );
  return (await getAccessory(result.rows[0].id))!;
}

export async function updateAccessory(
  id: number,
  input: AccessoryInput,
): Promise<Accessory | null> {
  const result = await query(
    `UPDATE accessories SET name = $2, description = $3, is_active = $4, sort_order = $5
     WHERE id = $1`,
    [id, input.name, input.description, input.isActive, input.sortOrder],
  );
  return (result.rowCount ?? 0) > 0 ? getAccessory(id) : null;
}

async function getAccessory(id: number): Promise<Accessory | null> {
  const result = await query<AccessoryRow>(
    `SELECT ${SELECT_COLUMNS} FROM accessories x WHERE x.id = $1`,
    [id],
  );
  return result.rows[0] ? mapAccessory(result.rows[0]) : null;
}

/** Throws AccessoryInUseError while any asset (soft-deleted ones included, their rows are still
 * history) has it attached; the admin retires it instead. The FK is ON DELETE RESTRICT, so the
 * pre-check only exists to turn that into a clean 409, and a concurrent attach is caught too. */
export async function deleteAccessory(id: number): Promise<boolean> {
  const used = await query(
    `SELECT 1 FROM asset_accessories WHERE accessory_id = $1 LIMIT 1`,
    [id],
  );
  if ((used.rowCount ?? 0) > 0) throw new AccessoryInUseError();
  try {
    const result = await query(`DELETE FROM accessories WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new AccessoryInUseError();
    throw err;
  }
}
