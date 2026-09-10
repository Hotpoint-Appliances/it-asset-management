import { query } from "./query";
import { toIsoString, toDateOnlyString } from "./dates";
import type {
  AssetMaintenance,
  MaintenanceInput,
  MaintenanceUpdateInput,
} from "@/types/maintenance";

interface MaintenanceRow {
  id: number;
  asset_id: string;
  maintenance_type: AssetMaintenance["maintenanceType"];
  vendor_id: number | null;
  vendor_name: string | null;
  // pg parses date/timestamptz columns into Date objects — see lib/db/dates.ts
  scheduled_date: Date | string | null;
  completed_date: Date | string | null;
  cost: string | null;
  status: AssetMaintenance["status"];
  notes: string | null;
  created_by: string;
  created_by_name: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapMaintenance(row: MaintenanceRow): AssetMaintenance {
  return {
    id: row.id,
    assetId: row.asset_id,
    maintenanceType: row.maintenance_type,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    scheduledDate: toDateOnlyString(row.scheduled_date),
    completedDate: toDateOnlyString(row.completed_date),
    cost: row.cost != null ? Number(row.cost) : null,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: toIsoString(row.created_at)!,
    updatedAt: toIsoString(row.updated_at)!,
  };
}

const SELECT_COLUMNS = `m.id, m.asset_id, m.maintenance_type, m.vendor_id, v.name AS vendor_name,
  m.scheduled_date, m.completed_date, m.cost, m.status, m.notes, m.created_by,
  u.full_name AS created_by_name, m.created_at, m.updated_at`;
const JOINS = `LEFT JOIN vendors v ON v.id = m.vendor_id JOIN users u ON u.id = m.created_by`;

export async function listMaintenanceForAsset(
  assetId: string,
): Promise<AssetMaintenance[]> {
  const result = await query<MaintenanceRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_maintenance m ${JOINS}
     WHERE m.asset_id = $1 ORDER BY m.created_at DESC`,
    [assetId],
  );
  return result.rows.map(mapMaintenance);
}

export async function getMaintenanceById(
  id: number,
): Promise<AssetMaintenance | null> {
  const result = await query<MaintenanceRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_maintenance m ${JOINS} WHERE m.id = $1`,
    [id],
  );
  return result.rows[0] ? mapMaintenance(result.rows[0]) : null;
}

export async function createMaintenance(
  assetId: string,
  input: MaintenanceInput,
  createdBy: string,
): Promise<AssetMaintenance> {
  const result = await query<MaintenanceRow>(
    `WITH inserted AS (
       INSERT INTO asset_maintenance (asset_id, maintenance_type, vendor_id, scheduled_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, asset_id, maintenance_type, vendor_id, scheduled_date, completed_date, cost,
         status, notes, created_by, created_at, updated_at
     )
     SELECT ${SELECT_COLUMNS} FROM inserted m ${JOINS}`,
    [
      assetId,
      input.maintenanceType,
      input.vendorId,
      input.scheduledDate,
      input.notes,
      createdBy,
    ],
  );
  return mapMaintenance(result.rows[0]);
}

/** Status transitions and field edits share one endpoint (phase-5-asset-lifecycle Step 4) —
 * `completedDate` defaults to today when the caller marks `completed` without supplying one. */
export async function updateMaintenance(
  id: number,
  input: MaintenanceUpdateInput,
): Promise<AssetMaintenance | null> {
  const completedDate =
    input.status === "completed"
      ? (input.completedDate ?? new Date().toISOString().slice(0, 10))
      : input.completedDate;
  const result = await query<MaintenanceRow>(
    `WITH updated AS (
       UPDATE asset_maintenance SET status = $2, completed_date = $3, cost = $4, notes = $5
       WHERE id = $1
       RETURNING id, asset_id, maintenance_type, vendor_id, scheduled_date, completed_date, cost,
         status, notes, created_by, created_at, updated_at
     )
     SELECT ${SELECT_COLUMNS} FROM updated m ${JOINS}`,
    [id, input.status, completedDate, input.cost, input.notes],
  );
  return result.rows[0] ? mapMaintenance(result.rows[0]) : null;
}
