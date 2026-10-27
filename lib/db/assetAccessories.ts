import type { PoolClient } from "pg";
import { query, withTransaction } from "./query";
import { canEditAccessories, formatAccessory } from "@/lib/assetAccessories";
import { formatLookupName } from "@/lib/badgeVariants";
import type { AssetAccessory, AssetAccessoryInput } from "@/types/accessory";

interface AssetAccessoryRow {
  accessory_id: number;
  name: string;
  is_active: boolean;
  quantity: number;
  notes: string | null;
}

function mapAssetAccessory(row: AssetAccessoryRow): AssetAccessory {
  return {
    accessoryId: row.accessory_id,
    name: row.name,
    isActive: row.is_active,
    quantity: row.quantity,
    notes: row.notes,
  };
}

const LIST_SQL = `SELECT aa.accessory_id, x.name, x.is_active, aa.quantity, aa.notes
  FROM asset_accessories aa JOIN accessories x ON x.id = aa.accessory_id
  WHERE aa.asset_id = $1
  ORDER BY x.sort_order, x.name`;

/** Callers check the asset itself is visible to the requester (getAssetById) first. */
export async function listAssetAccessories(
  assetId: string,
): Promise<AssetAccessory[]> {
  const result = await query<AssetAccessoryRow>(LIST_SQL, [assetId]);
  return result.rows.map(mapAssetAccessory);
}

/** A request that can't be applied (locked status, unknown or retired accessory), surfaced by
 * the route as a 400. */
export class AssetAccessoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetAccessoryError";
  }
}

/** Replaces an asset's accessory list with `items` inside the caller's transaction, writing one
 * accessory_added / accessory_removed / accessory_updated audit row per difference (values are
 * display snapshots, e.g. "Charger × 2", so history survives a later rename). Shared by asset
 * create, the full edit, and the detail tab's PUT, so the lock rule and the audit diffing live
 * once. The lock rule is checked against the asset's status as it stands in this transaction,
 * i.e. after a same-transaction edit, so recovering a lost asset and updating its kit in one
 * save works. Returns false when the asset doesn't exist. */
export async function syncAssetAccessories(
  client: PoolClient,
  assetId: string,
  items: AssetAccessoryInput[],
  performedBy: string,
): Promise<boolean> {
  // FOR UPDATE OF a: serializes concurrent edits of the same asset's list (a no-op re-lock when
  // the caller's own UPDATE already holds it).
  const assetResult = await client.query<{ status_name: string }>(
    `SELECT st.name AS status_name FROM assets a
     JOIN asset_statuses st ON st.id = a.status_id
     WHERE a.id = $1 AND a.deleted_at IS NULL FOR UPDATE OF a`,
    [assetId],
  );
  const statusName = assetResult.rows[0]?.status_name;
  if (statusName === undefined) return false;

  const current = (
    await client.query<AssetAccessoryRow>(LIST_SQL, [assetId])
  ).rows.map(mapAssetAccessory);
  const currentById = new Map(current.map((a) => [a.accessoryId, a]));
  const nextIds = new Set(items.map((i) => i.accessoryId));

  const added = items.filter((i) => !currentById.has(i.accessoryId));
  const removed = current.filter((a) => !nextIds.has(a.accessoryId));
  const updated = items.filter((i) => {
    const before = currentById.get(i.accessoryId);
    return (
      before !== undefined &&
      (before.quantity !== i.quantity ||
        (before.notes ?? null) !== (i.notes ?? null))
    );
  });
  if (added.length + removed.length + updated.length === 0) return true;

  if (!canEditAccessories(statusName)) {
    throw new AssetAccessoryError(
      `Accessories can't be changed while the asset is ${formatLookupName(statusName).toLowerCase()}`,
    );
  }

  // Newly attached accessories must exist and be active; an already-attached retired one may
  // stay (and have its quantity/notes edited) so retiring never forces a data change.
  const names = new Map(current.map((a) => [a.accessoryId, a.name]));
  if (added.length > 0) {
    const found = await client.query<{
      id: number;
      name: string;
      is_active: boolean;
    }>(
      `SELECT id, name, is_active FROM accessories WHERE id = ANY($1::int[])`,
      [added.map((a) => a.accessoryId)],
    );
    const byId = new Map(found.rows.map((r) => [r.id, r]));
    for (const a of added) {
      const row = byId.get(a.accessoryId);
      if (!row) throw new AssetAccessoryError("Accessory not found");
      if (!row.is_active) {
        throw new AssetAccessoryError(
          `${row.name} is retired and can't be added`,
        );
      }
      names.set(row.id, row.name);
    }
  }

  const audit = (
    actionType: string,
    oldValue: string | null,
    newValue: string | null,
  ) =>
    client.query(
      `INSERT INTO asset_audit_log (asset_id, action_type, field_name, old_value, new_value, performed_by)
       VALUES ($1, $2, 'accessory', $3, $4, $5)`,
      [assetId, actionType, oldValue, newValue, performedBy],
    );

  for (const a of removed) {
    await client.query(
      `DELETE FROM asset_accessories WHERE asset_id = $1 AND accessory_id = $2`,
      [assetId, a.accessoryId],
    );
    await audit("accessory_removed", formatAccessory(a), null);
  }
  for (const a of added) {
    await client.query(
      `INSERT INTO asset_accessories (asset_id, accessory_id, quantity, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, a.accessoryId, a.quantity, a.notes, performedBy],
    );
    await audit(
      "accessory_added",
      null,
      formatAccessory({ ...a, name: names.get(a.accessoryId)! }),
    );
  }
  for (const a of updated) {
    const before = currentById.get(a.accessoryId)!;
    await client.query(
      `UPDATE asset_accessories SET quantity = $3, notes = $4
       WHERE asset_id = $1 AND accessory_id = $2`,
      [assetId, a.accessoryId, a.quantity, a.notes],
    );
    await audit(
      "accessory_updated",
      formatAccessory(before),
      formatAccessory({ ...a, name: before.name }),
    );
  }

  // Bumps updated_at via the trigger, so the asset's "Last updated" reflects kit changes too.
  await client.query(`UPDATE assets SET updated_at = now() WHERE id = $1`, [
    assetId,
  ]);
  return true;
}

/** The detail tab's standalone save (PUT /api/assets/[id]/accessories). */
export async function replaceAssetAccessories(
  assetId: string,
  items: AssetAccessoryInput[],
  performedBy: string,
): Promise<AssetAccessory[] | null> {
  return withTransaction(async (client) => {
    const ok = await syncAssetAccessories(client, assetId, items, performedBy);
    if (!ok) return null;
    const result = await client.query<AssetAccessoryRow>(LIST_SQL, [assetId]);
    return result.rows.map(mapAssetAccessory);
  });
}
