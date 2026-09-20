import { query } from "./query";
import { toIsoString, toDateOnlyString } from "./dates";
import type { AssetRequester } from "./assets";
import type {
  CountByName,
  FleetOverview,
  WarrantyExpiringItem,
  RecentActivityItem,
  AssetInRepairItem,
} from "@/types/dashboard";

/** Every query here takes the requester and enforces viewer department scoping in SQL, the
 * same query-layer pattern as buildAssetFilterClause in lib/db/assets.ts (itam-conventions:
 * "never filter only in the UI"). `$1` = is-viewer, `$2` = the requester's department id, and
 * the shared fragment below is the only place that pair is interpreted. A viewer with no
 * department matches nothing (`= NULL` is never true), same as the asset list. */
const scopeParams = (requester: AssetRequester) => [
  requester.roleName === "viewer",
  requester.departmentId,
];
const SCOPE = `($1::boolean IS FALSE OR a.department_id = $2)`;

interface CountRow {
  id: number;
  name: string;
  count: string;
}
const toCounts = (rows: CountRow[]): CountByName[] =>
  rows.map((r) => ({ id: r.id, name: r.name, count: Number(r.count) }));

export async function getFleetOverview(
  requester: AssetRequester,
): Promise<FleetOverview> {
  const params = scopeParams(requester);
  const [status, category, department] = await Promise.all([
    // Left-joined from the lookup so a status with zero assets still shows (as 0).
    query<CountRow>(
      `SELECT st.id, st.name, count(a.id) AS count
       FROM asset_statuses st
       LEFT JOIN assets a ON a.status_id = st.id AND a.deleted_at IS NULL AND ${SCOPE}
       GROUP BY st.id ORDER BY st.sort_order`,
      params,
    ),
    query<CountRow>(
      `SELECT c.id, c.name, count(a.id) AS count
       FROM assets a JOIN categories c ON c.id = a.category_id JOIN asset_statuses st ON st.id = a.status_id
       WHERE a.deleted_at IS NULL AND st.name <> 'disposed' AND ${SCOPE}
       GROUP BY c.id ORDER BY count(a.id) DESC, c.name LIMIT 8`,
      params,
    ),
    query<CountRow>(
      `SELECT d.id, d.name, count(a.id) AS count
       FROM assets a JOIN departments d ON d.id = a.department_id JOIN asset_statuses st ON st.id = a.status_id
       WHERE a.deleted_at IS NULL AND st.name <> 'disposed' AND ${SCOPE}
       GROUP BY d.id ORDER BY count(a.id) DESC, d.name LIMIT 8`,
      params,
    ),
  ]);
  const byStatus = toCounts(status.rows);
  const total = byStatus.reduce((sum, s) => sum + s.count, 0);
  const disposed = byStatus.find((s) => s.name === "disposed")?.count ?? 0;
  return {
    total,
    inService: total - disposed,
    byStatus,
    byCategory: toCounts(category.rows),
    byDepartment: toCounts(department.rows),
  };
}

/** Assets whose warranty ends within the next `withinDays` days (today inclusive), soonest first.
 * Disposed assets are excluded, a warranty on something already retired isn't actionable. The
 * caller passes the widest configured window and filters to the narrower ones client-side.
 * Phase 7's notification trigger reuses this. */
export async function listWarrantyExpiring(
  withinDays: number,
  requester: AssetRequester,
  limit = 50,
): Promise<WarrantyExpiringItem[]> {
  const result = await query<{
    id: string;
    asset_tag: string;
    name: string;
    department_name: string;
    warranty_expiry: Date | string;
    days_remaining: number;
  }>(
    `SELECT a.id, a.asset_tag, a.name, d.name AS department_name, a.warranty_expiry,
            (a.warranty_expiry - CURRENT_DATE)::int AS days_remaining
     FROM assets a
     JOIN departments d ON d.id = a.department_id
     JOIN asset_statuses st ON st.id = a.status_id
     WHERE a.deleted_at IS NULL AND st.name <> 'disposed' AND ${SCOPE}
       AND a.warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + $3::int
     ORDER BY a.warranty_expiry, a.asset_tag LIMIT $4`,
    [...scopeParams(requester), withinDays, limit],
  );
  return result.rows.map((r) => ({
    id: r.id,
    assetTag: r.asset_tag,
    name: r.name,
    departmentName: r.department_name,
    warrantyExpiry: toDateOnlyString(r.warranty_expiry)!,
    daysRemaining: r.days_remaining,
  }));
}

export async function listRecentActivity(
  requester: AssetRequester,
  limit = 10,
): Promise<RecentActivityItem[]> {
  const result = await query<{
    id: number;
    asset_id: string;
    asset_tag: string;
    asset_name: string;
    action_type: string;
    field_name: string | null;
    note: string | null;
    performed_by_name: string;
    performed_at: Date | string;
  }>(
    `SELECT l.id, l.asset_id, a.asset_tag, a.name AS asset_name, l.action_type, l.field_name,
            l.note, u.full_name AS performed_by_name, l.performed_at
     FROM asset_audit_log l
     JOIN assets a ON a.id = l.asset_id
     JOIN users u ON u.id = l.performed_by
     WHERE a.deleted_at IS NULL AND ${SCOPE}
     ORDER BY l.performed_at DESC, l.id DESC LIMIT $3`,
    [...scopeParams(requester), limit],
  );
  return result.rows.map((r) => ({
    id: r.id,
    assetId: r.asset_id,
    assetTag: r.asset_tag,
    assetName: r.asset_name,
    actionType: r.action_type,
    fieldName: r.field_name,
    note: r.note,
    performedByName: r.performed_by_name,
    performedAt: toIsoString(r.performed_at)!,
  }));
}

export async function listAssetsInRepair(
  requester: AssetRequester,
  limit = 20,
): Promise<AssetInRepairItem[]> {
  const result = await query<{
    maintenance_id: number;
    asset_id: string;
    asset_tag: string;
    asset_name: string;
    maintenance_type: string;
    vendor_name: string | null;
    started_at: Date | string;
  }>(
    `SELECT m.id AS maintenance_id, a.id AS asset_id, a.asset_tag, a.name AS asset_name,
            m.maintenance_type, v.name AS vendor_name, m.updated_at AS started_at
     FROM asset_maintenance m
     JOIN assets a ON a.id = m.asset_id
     LEFT JOIN vendors v ON v.id = m.vendor_id
     WHERE m.status = 'in_progress' AND a.deleted_at IS NULL AND ${SCOPE}
     ORDER BY m.updated_at DESC LIMIT $3`,
    [...scopeParams(requester), limit],
  );
  return result.rows.map((r) => ({
    maintenanceId: r.maintenance_id,
    assetId: r.asset_id,
    assetTag: r.asset_tag,
    assetName: r.asset_name,
    maintenanceType: r.maintenance_type,
    vendorName: r.vendor_name,
    startedAt: toIsoString(r.started_at)!,
  }));
}
