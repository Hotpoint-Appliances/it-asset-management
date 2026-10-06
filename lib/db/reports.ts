import { query } from "./query";
import { toIsoString, toDateOnlyString } from "./dates";
import {
  buildAssetFilterClause,
  buildAssetOrderBy,
  RELATIONS_JOIN,
  type AssetRequester,
} from "./assets";
import type { AssetFilters } from "@/types/asset";

/** Export queries for phase-6 reports. Unlike the list endpoints these return the *full*
 * matching dataset (no LIMIT/OFFSET, an export that silently stopped at page 1 would be worse
 * than useless for an audit), and every lookup id is resolved to its name in SQL so no raw
 * foreign key can reach a workbook. Viewer department scoping is applied in the query, same as
 * everywhere else. */

const scopeParams = (requester: AssetRequester) => [
  requester.roleName === "viewer",
  requester.departmentId,
];

export type ExportFilters = Omit<AssetFilters, "limit" | "offset">;

export interface AssetRegisterRow {
  assetTag: string;
  name: string;
  categoryName: string;
  modelNumber: string | null;
  serialNumber: string | null;
  locationName: string;
  departmentName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  conditionName: string;
  statusName: string;
  vendorName: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiry: string | null;
  depreciationMethod: string | null;
  usefulLifeMonths: number | null;
  salvageValue: number | null;
  notes: string | null;
  createdByName: string;
  createdAt: string;
}

const num = (v: string | null): number | null => (v == null ? null : Number(v));

export async function listAssetRegister(
  filters: ExportFilters,
  requester: AssetRequester,
): Promise<AssetRegisterRow[]> {
  const { where, params } = buildAssetFilterClause(
    { ...filters, limit: 0, offset: 0 },
    requester,
  );
  const result = await query<{
    asset_tag: string;
    name: string;
    category_name: string;
    model_number: string | null;
    serial_number: string | null;
    location_name: string;
    department_name: string;
    assigned_user_name: string | null;
    owner_name: string | null;
    owner_email: string | null;
    condition_name: string;
    status_name: string;
    vendor_name: string | null;
    purchase_date: Date | string | null;
    purchase_cost: string | null;
    warranty_expiry: Date | string | null;
    depreciation_method: string | null;
    useful_life_months: number | null;
    salvage_value: string | null;
    notes: string | null;
    created_by_name: string;
    created_at: Date | string;
  }>(
    `SELECT a.asset_tag, a.name, c.name AS category_name, a.model_number, a.serial_number,
            l.name AS location_name, d.name AS department_name,
            au.full_name AS assigned_user_name, a.owner_name, a.owner_email,
            cond.name AS condition_name, st.name AS status_name, v.name AS vendor_name,
            a.purchase_date, a.purchase_cost, a.warranty_expiry, a.depreciation_method,
            a.useful_life_months, a.salvage_value, a.notes, cb.full_name AS created_by_name,
            a.created_at
     ${RELATIONS_JOIN}
     WHERE ${where}
     ORDER BY ${buildAssetOrderBy(filters.sort, "a.asset_tag")}`,
    params,
  );
  return result.rows.map((r) => ({
    assetTag: r.asset_tag,
    name: r.name,
    categoryName: r.category_name,
    modelNumber: r.model_number,
    serialNumber: r.serial_number,
    locationName: r.location_name,
    departmentName: r.department_name,
    // A system user takes precedence over the free-text owner, same rule as the asset detail page.
    ownerName: r.assigned_user_name ?? r.owner_name,
    ownerEmail: r.owner_email,
    conditionName: r.condition_name,
    statusName: r.status_name,
    vendorName: r.vendor_name,
    purchaseDate: toDateOnlyString(r.purchase_date),
    purchaseCost: num(r.purchase_cost),
    warrantyExpiry: toDateOnlyString(r.warranty_expiry),
    depreciationMethod: r.depreciation_method,
    usefulLifeMonths: r.useful_life_months,
    salvageValue: num(r.salvage_value),
    notes: r.notes,
    createdByName: r.created_by_name,
    createdAt: toIsoString(r.created_at)!,
  }));
}

/** Audit `field_name` -> the table (and display column) its old/new values are ids into. Only
 * constants are interpolated into the SQL below, never request data. */
const AUDIT_LOOKUPS: Record<string, { table: string; column: string }> = {
  category_id: { table: "categories", column: "name" },
  location_id: { table: "locations", column: "name" },
  department_id: { table: "departments", column: "name" },
  condition_id: { table: "asset_conditions", column: "name" },
  status_id: { table: "asset_statuses", column: "name" },
  vendor_id: { table: "vendors", column: "name" },
  assigned_user_id: { table: "users", column: "full_name" },
};

/** Resolves `l.<col>` to a display name for id-backed fields (comparing id::text so a stale or
 * malformed value can never raise a cast error), falling back to the raw value when the row it
 * pointed at no longer exists. */
const resolvedAuditValue = (col: "old_value" | "new_value") =>
  `CASE l.field_name ${Object.entries(AUDIT_LOOKUPS)
    .map(
      ([field, { table, column }]) =>
        `WHEN '${field}' THEN COALESCE((SELECT x.${column} FROM ${table} x WHERE x.id::text = l.${col}), l.${col})`,
    )
    .join(" ")} ELSE l.${col} END`;

export interface AuditExportFilters {
  assetId: string | null;
  /** Inclusive date-only bounds, "YYYY-MM-DD". */
  from: string | null;
  to: string | null;
}

export interface AuditExportRow {
  performedAt: string;
  assetTag: string;
  assetName: string;
  actionType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  performedByName: string;
}

export async function listAuditForExport(
  filters: AuditExportFilters,
  requester: AssetRequester,
): Promise<AuditExportRow[]> {
  const result = await query<{
    performed_at: Date | string;
    asset_tag: string;
    asset_name: string;
    action_type: string;
    field_name: string | null;
    old_value: string | null;
    new_value: string | null;
    note: string | null;
    performed_by_name: string;
  }>(
    `SELECT l.performed_at, a.asset_tag, a.name AS asset_name, l.action_type, l.field_name,
            ${resolvedAuditValue("old_value")} AS old_value,
            ${resolvedAuditValue("new_value")} AS new_value,
            l.note, u.full_name AS performed_by_name
     FROM asset_audit_log l
     JOIN assets a ON a.id = l.asset_id
     JOIN users u ON u.id = l.performed_by
     WHERE a.deleted_at IS NULL
       AND ($1::boolean IS FALSE OR a.department_id = $2)
       AND ($3::uuid IS NULL OR l.asset_id = $3)
       AND ($4::date IS NULL OR l.performed_at >= $4::date)
       AND ($5::date IS NULL OR l.performed_at < ($5::date + 1))
     ORDER BY l.performed_at DESC, l.id DESC`,
    [...scopeParams(requester), filters.assetId, filters.from, filters.to],
  );
  return result.rows.map((r) => ({
    performedAt: toIsoString(r.performed_at)!,
    assetTag: r.asset_tag,
    assetName: r.asset_name,
    actionType: r.action_type,
    fieldName: r.field_name,
    oldValue: r.old_value,
    newValue: r.new_value,
    note: r.note,
    performedByName: r.performed_by_name,
  }));
}

export interface DisposalRegisterRow {
  assetTag: string;
  name: string;
  categoryName: string;
  departmentName: string;
  locationName: string;
  purchaseDate: string | null;
  purchaseCost: number | null;
  disposalDate: string;
  disposalMethod: string;
  disposalValue: number | null;
  approvedByName: string;
  notes: string | null;
  hasAttachment: boolean;
}

export async function listDisposalRegister(
  requester: AssetRequester,
): Promise<DisposalRegisterRow[]> {
  const result = await query<{
    asset_tag: string;
    name: string;
    category_name: string;
    department_name: string;
    location_name: string;
    purchase_date: Date | string | null;
    purchase_cost: string | null;
    disposal_date: Date | string;
    disposal_method: string;
    disposal_value: string | null;
    approved_by_name: string;
    notes: string | null;
    has_attachment: boolean;
  }>(
    `SELECT a.asset_tag, a.name, c.name AS category_name, d.name AS department_name,
            l.name AS location_name, a.purchase_date, a.purchase_cost,
            dp.disposal_date, dp.disposal_method, dp.disposal_value,
            u.full_name AS approved_by_name, dp.notes,
            (dp.attachment_path IS NOT NULL) AS has_attachment
     FROM asset_disposals dp
     JOIN assets a ON a.id = dp.asset_id
     JOIN categories c ON c.id = a.category_id
     JOIN departments d ON d.id = a.department_id
     JOIN locations l ON l.id = a.location_id
     JOIN users u ON u.id = dp.approved_by
     WHERE a.deleted_at IS NULL AND ($1::boolean IS FALSE OR a.department_id = $2)
     ORDER BY dp.disposal_date DESC, a.asset_tag`,
    scopeParams(requester),
  );
  return result.rows.map((r) => ({
    assetTag: r.asset_tag,
    name: r.name,
    categoryName: r.category_name,
    departmentName: r.department_name,
    locationName: r.location_name,
    purchaseDate: toDateOnlyString(r.purchase_date),
    purchaseCost: num(r.purchase_cost),
    disposalDate: toDateOnlyString(r.disposal_date)!,
    disposalMethod: r.disposal_method,
    disposalValue: num(r.disposal_value),
    approvedByName: r.approved_by_name,
    notes: r.notes,
    hasAttachment: r.has_attachment,
  }));
}

export interface DepreciationRow {
  assetTag: string;
  name: string;
  categoryName: string;
  departmentName: string;
  statusName: string;
  depreciationMethod: string;
  purchaseDate: string | null;
  purchaseCost: number | null;
  usefulLifeMonths: number | null;
  salvageValue: number | null;
}

/** Assets that carry a depreciation method, excluding disposed ones (retired, no longer on the
 * books). The straight-line arithmetic itself lives in lib/reports/depreciation.ts. */
export async function listDepreciableAssets(
  requester: AssetRequester,
): Promise<DepreciationRow[]> {
  const result = await query<{
    asset_tag: string;
    name: string;
    category_name: string;
    department_name: string;
    status_name: string;
    depreciation_method: string;
    purchase_date: Date | string | null;
    purchase_cost: string | null;
    useful_life_months: number | null;
    salvage_value: string | null;
  }>(
    `SELECT a.asset_tag, a.name, c.name AS category_name, d.name AS department_name,
            st.name AS status_name, a.depreciation_method, a.purchase_date, a.purchase_cost,
            a.useful_life_months, a.salvage_value
     FROM assets a
     JOIN categories c ON c.id = a.category_id
     JOIN departments d ON d.id = a.department_id
     JOIN asset_statuses st ON st.id = a.status_id
     WHERE a.deleted_at IS NULL AND st.name <> 'disposed'
       AND a.depreciation_method IS NOT NULL
       AND ($1::boolean IS FALSE OR a.department_id = $2)
     ORDER BY a.asset_tag`,
    scopeParams(requester),
  );
  return result.rows.map((r) => ({
    assetTag: r.asset_tag,
    name: r.name,
    categoryName: r.category_name,
    departmentName: r.department_name,
    statusName: r.status_name,
    depreciationMethod: r.depreciation_method,
    purchaseDate: toDateOnlyString(r.purchase_date),
    purchaseCost: num(r.purchase_cost),
    usefulLifeMonths: r.useful_life_months,
    salvageValue: num(r.salvage_value),
  }));
}
