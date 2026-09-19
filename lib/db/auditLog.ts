import { query } from "./query";
import { toIsoString } from "./dates";
import type { AssetAuditLogEntry } from "@/types/auditLog";

interface AuditLogRow {
  id: number;
  asset_id: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  performed_by: string;
  performed_by_name: string;
  performed_at: Date | string; // pg parses timestamptz into a Date — see lib/db/dates.ts
}

function mapAuditLogEntry(row: AuditLogRow): AssetAuditLogEntry {
  return {
    id: row.id,
    assetId: row.asset_id,
    actionType: row.action_type,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    note: row.note,
    performedBy: row.performed_by,
    performedByName: row.performed_by_name,
    performedAt: toIsoString(row.performed_at)!,
  };
}

const SELECT_COLUMNS = `l.id, l.asset_id, l.action_type, l.field_name, l.old_value, l.new_value,
  l.note, l.performed_by, u.full_name AS performed_by_name, l.performed_at`;

/** Chronological (newest first) timeline for the asset detail page's Audit Log tab — the payoff
 * of the unified audit log design (itam-schema-reference point 1): one query, every event type. */
export async function listAuditLogForAsset(
  assetId: string,
): Promise<AssetAuditLogEntry[]> {
  const result = await query<AuditLogRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_audit_log l JOIN users u ON u.id = l.performed_by
     WHERE l.asset_id = $1 ORDER BY l.performed_at DESC, l.id DESC`,
    [assetId],
  );
  return result.rows.map(mapAuditLogEntry);
}

/** Finds the status an asset was in immediately before its most recent transition into
 * `inRepairStatusId`, by reading the `status_change` row that made that transition — used by the
 * maintenance module's "mark completed -> prompt to restore the prior status" flow
 * (docs/asset-lifecycle-flow.md rule 5) without a schema change, per the unified-audit-log
 * design. Returns null if no such transition is on record (e.g. the asset was created directly
 * in_repair) — the caller falls back to letting the user pick a status manually. */
export async function findStatusBeforeMostRecentInRepair(
  assetId: string,
  inRepairStatusId: number,
): Promise<number | null> {
  const result = await query<{ old_value: string | null }>(
    `SELECT old_value FROM asset_audit_log
     WHERE asset_id = $1 AND action_type = 'status_change' AND new_value = $2
     ORDER BY performed_at DESC, id DESC LIMIT 1`,
    [assetId, String(inRepairStatusId)],
  );
  const raw = result.rows[0]?.old_value;
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}
