import { query, withTransaction } from "./query";
import { toIsoString, toDateOnlyString } from "./dates";
import type { PageResult } from "./departments";
import type { Asset, AssetWithRelations, AssetListItem, AssetInput, AssetFilters } from "@/types/asset";
import type { RoleName } from "@/lib/auth/session";

interface AssetRow {
  id: string;
  asset_tag: string;
  name: string;
  category_id: number;
  model_number: string | null;
  serial_number: string | null;
  location_id: number;
  department_id: number;
  image_path: string | null;
  assigned_user_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  condition_id: number;
  status_id: number;
  vendor_id: number | null;
  // pg parses date/timestamptz columns into Date objects at runtime — see lib/db/dates.ts
  purchase_date: Date | string | null;
  purchase_cost: string | null;
  warranty_expiry: Date | string | null;
  depreciation_method: Asset["depreciationMethod"];
  useful_life_months: number | null;
  salvage_value: string | null;
  notes: string | null;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
}

function mapAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    assetTag: row.asset_tag,
    name: row.name,
    categoryId: row.category_id,
    modelNumber: row.model_number,
    serialNumber: row.serial_number,
    locationId: row.location_id,
    departmentId: row.department_id,
    imagePath: row.image_path,
    assignedUserId: row.assigned_user_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    conditionId: row.condition_id,
    statusId: row.status_id,
    vendorId: row.vendor_id,
    purchaseDate: toDateOnlyString(row.purchase_date),
    purchaseCost: row.purchase_cost != null ? Number(row.purchase_cost) : null,
    warrantyExpiry: toDateOnlyString(row.warranty_expiry),
    depreciationMethod: row.depreciation_method,
    usefulLifeMonths: row.useful_life_months,
    salvageValue: row.salvage_value != null ? Number(row.salvage_value) : null,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at)!,
    updatedAt: toIsoString(row.updated_at)!,
  };
}

const SELECT_COLUMNS = `id, asset_tag, name, category_id, model_number, serial_number,
  location_id, department_id, image_path, assigned_user_id, owner_name, owner_email,
  condition_id, status_id, vendor_id, purchase_date, purchase_cost, warranty_expiry,
  depreciation_method, useful_life_months, salvage_value, notes, created_by, created_at, updated_at`;

const RELATIONS_SELECT = `
  a.id, a.asset_tag, a.name, a.category_id, a.model_number, a.serial_number,
  a.location_id, a.department_id, a.image_path, a.assigned_user_id, a.owner_name, a.owner_email,
  a.condition_id, a.status_id, a.vendor_id, a.purchase_date, a.purchase_cost, a.warranty_expiry,
  a.depreciation_method, a.useful_life_months, a.salvage_value, a.notes, a.created_by,
  a.created_at, a.updated_at,
  c.name AS category_name, l.name AS location_name, d.name AS department_name,
  cond.name AS condition_name, st.name AS status_name, v.name AS vendor_name,
  au.full_name AS assigned_user_name, cb.full_name AS created_by_name
`;

const RELATIONS_JOIN = `
  FROM assets a
  JOIN categories c ON c.id = a.category_id
  JOIN locations l ON l.id = a.location_id
  JOIN departments d ON d.id = a.department_id
  JOIN asset_conditions cond ON cond.id = a.condition_id
  JOIN asset_statuses st ON st.id = a.status_id
  LEFT JOIN vendors v ON v.id = a.vendor_id
  LEFT JOIN users au ON au.id = a.assigned_user_id
  JOIN users cb ON cb.id = a.created_by
`;

interface AssetWithRelationsRow extends AssetRow {
  category_name: string;
  location_name: string;
  department_name: string;
  condition_name: string;
  status_name: string;
  vendor_name: string | null;
  assigned_user_name: string | null;
  created_by_name: string;
}

function mapAssetWithRelations(row: AssetWithRelationsRow): AssetWithRelations {
  return {
    ...mapAsset(row),
    categoryName: row.category_name,
    locationName: row.location_name,
    departmentName: row.department_name,
    conditionName: row.condition_name,
    statusName: row.status_name,
    vendorName: row.vendor_name,
    assignedUserName: row.assigned_user_name,
    createdByName: row.created_by_name,
  };
}

interface AssetListRow {
  id: string;
  asset_tag: string;
  name: string;
  image_path: string | null;
  category_name: string;
  status_name: string;
  condition_name: string;
  location_name: string;
  department_name: string;
  assigned_user_name: string | null;
  owner_name: string | null;
}

function mapAssetListItem(row: AssetListRow): AssetListItem {
  return {
    id: row.id,
    assetTag: row.asset_tag,
    name: row.name,
    imagePath: row.image_path,
    categoryName: row.category_name,
    statusName: row.status_name,
    conditionName: row.condition_name,
    locationName: row.location_name,
    departmentName: row.department_name,
    assignedUserName: row.assigned_user_name,
    ownerName: row.owner_name,
  };
}

export interface AssetRequester {
  roleName: RoleName;
  departmentId: number | null;
}

/** Builds the shared WHERE clause + params for list/count, including the viewer department
 * scoping enforced at the query layer per itam-conventions (consistent with Phase 2's pattern
 * in listUsers). */
function buildAssetFilterClause(
  filters: AssetFilters,
  requester: AssetRequester,
): { where: string; params: unknown[] } {
  const params: unknown[] = [
    filters.statusIds.length ? filters.statusIds : null,
    filters.categoryIds.length ? filters.categoryIds : null,
    filters.departmentIds.length ? filters.departmentIds : null,
    filters.locationIds.length ? filters.locationIds : null,
    filters.conditionIds.length ? filters.conditionIds : null,
    filters.search || null,
    requester.roleName === "viewer",
    requester.departmentId,
  ];
  const where = `
    a.deleted_at IS NULL
    AND ($1::int[] IS NULL OR a.status_id = ANY($1))
    AND ($2::int[] IS NULL OR a.category_id = ANY($2))
    AND ($3::int[] IS NULL OR a.department_id = ANY($3))
    AND ($4::int[] IS NULL OR a.location_id = ANY($4))
    AND ($5::int[] IS NULL OR a.condition_id = ANY($5))
    AND ($6::text IS NULL OR a.asset_tag ILIKE '%' || $6 || '%' OR a.name ILIKE '%' || $6 || '%' OR a.serial_number ILIKE '%' || $6 || '%')
    AND ($7::boolean IS FALSE OR a.department_id = $8)
  `;
  return { where, params };
}

export async function listAssets(
  filters: AssetFilters,
  requester: AssetRequester,
): Promise<PageResult<AssetListItem>> {
  const { where, params } = buildAssetFilterClause(filters, requester);
  const [rows, count] = await Promise.all([
    query<AssetListRow>(
      `SELECT a.id, a.asset_tag, a.name, a.image_path,
              c.name AS category_name, st.name AS status_name, cond.name AS condition_name,
              l.name AS location_name, d.name AS department_name,
              au.full_name AS assigned_user_name, a.owner_name
       ${RELATIONS_JOIN}
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $9 OFFSET $10`,
      [...params, filters.limit, filters.offset],
    ),
    query<{ count: string }>(`SELECT count(*) ${RELATIONS_JOIN} WHERE ${where}`, params),
  ]);
  return { items: rows.rows.map(mapAssetListItem), total: Number(count.rows[0].count) };
}

/** Returns null both when the asset doesn't exist and when a viewer requests one outside their
 * own department — the caller (page/route) treats both as a 404, never leaking existence. */
export async function getAssetById(
  id: string,
  requester: AssetRequester,
): Promise<AssetWithRelations | null> {
  const result = await query<AssetWithRelationsRow>(
    `SELECT ${RELATIONS_SELECT} ${RELATIONS_JOIN} WHERE a.id = $1 AND a.deleted_at IS NULL`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (requester.roleName === "viewer" && row.department_id !== requester.departmentId) return null;
  return mapAssetWithRelations(row);
}

export async function createAsset(input: AssetInput, createdBy: string): Promise<Asset> {
  return withTransaction(async (client) => {
    const result = await client.query<AssetRow>(
      `INSERT INTO assets (
         asset_tag, name, category_id, model_number, serial_number, location_id, department_id,
         assigned_user_id, owner_name, owner_email, condition_id, status_id, vendor_id,
         purchase_date, purchase_cost, warranty_expiry, depreciation_method, useful_life_months,
         salvage_value, notes, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.assetTag,
        input.name,
        input.categoryId,
        input.modelNumber,
        input.serialNumber,
        input.locationId,
        input.departmentId,
        input.assignedUserId,
        input.ownerName,
        input.ownerEmail,
        input.conditionId,
        input.statusId,
        input.vendorId,
        input.purchaseDate,
        input.purchaseCost,
        input.warrantyExpiry,
        input.depreciationMethod,
        input.usefulLifeMonths,
        input.salvageValue,
        input.notes,
        createdBy,
      ],
    );
    const asset = mapAsset(result.rows[0]);
    await client.query(
      `INSERT INTO asset_audit_log (asset_id, action_type, performed_by) VALUES ($1, 'created', $2)`,
      [asset.id, createdBy],
    );
    return asset;
  });
}

/** Field -> asset_audit_log action_type, per docs/asset-lifecycle-flow.md's transition rules.
 * Anything not listed here falls back to the generic "updated" action_type. */
const AUDIT_ACTION_BY_FIELD: Record<string, string> = {
  location_id: "location_change",
  department_id: "department_change",
  assigned_user_id: "owner_change",
  owner_name: "owner_change",
  owner_email: "owner_change",
  condition_id: "condition_change",
  status_id: "status_change",
};

/** Columns considered for audit-log diffing on update — everything mutable via the edit form
 * except asset_tag/name, which change rarely enough that a generic "updated" row still covers
 * them if they do. */
const TRACKED_FIELDS: { column: string; get: (i: AssetInput) => unknown }[] = [
  { column: "name", get: (i) => i.name },
  { column: "category_id", get: (i) => i.categoryId },
  { column: "model_number", get: (i) => i.modelNumber },
  { column: "serial_number", get: (i) => i.serialNumber },
  { column: "location_id", get: (i) => i.locationId },
  { column: "department_id", get: (i) => i.departmentId },
  { column: "assigned_user_id", get: (i) => i.assignedUserId },
  { column: "owner_name", get: (i) => i.ownerName },
  { column: "owner_email", get: (i) => i.ownerEmail },
  { column: "condition_id", get: (i) => i.conditionId },
  { column: "status_id", get: (i) => i.statusId },
  { column: "vendor_id", get: (i) => i.vendorId },
  { column: "purchase_date", get: (i) => i.purchaseDate },
  { column: "purchase_cost", get: (i) => i.purchaseCost },
  { column: "warranty_expiry", get: (i) => i.warrantyExpiry },
  { column: "depreciation_method", get: (i) => i.depreciationMethod },
  { column: "useful_life_months", get: (i) => i.usefulLifeMonths },
  { column: "salvage_value", get: (i) => i.salvageValue },
  { column: "notes", get: (i) => i.notes },
];

function fieldFromAsset(asset: Asset, column: string): unknown {
  const map: Record<string, unknown> = {
    name: asset.name,
    category_id: asset.categoryId,
    model_number: asset.modelNumber,
    serial_number: asset.serialNumber,
    location_id: asset.locationId,
    department_id: asset.departmentId,
    assigned_user_id: asset.assignedUserId,
    owner_name: asset.ownerName,
    owner_email: asset.ownerEmail,
    condition_id: asset.conditionId,
    status_id: asset.statusId,
    vendor_id: asset.vendorId,
    // mapAsset already normalizes these to plain YYYY-MM-DD (toDateOnlyString), matching
    // input.purchaseDate/warrantyExpiry from the form's <input type="date"> exactly.
    purchase_date: asset.purchaseDate,
    purchase_cost: asset.purchaseCost,
    warranty_expiry: asset.warrantyExpiry,
    depreciation_method: asset.depreciationMethod,
    useful_life_months: asset.usefulLifeMonths,
    salvage_value: asset.salvageValue,
    notes: asset.notes,
  };
  return map[column];
}

export async function updateAsset(
  id: string,
  input: AssetInput,
  performedBy: string,
): Promise<Asset | null> {
  return withTransaction(async (client) => {
    const existingResult = await client.query<AssetRow>(
      `SELECT ${SELECT_COLUMNS} FROM assets WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id],
    );
    const existingRow = existingResult.rows[0];
    if (!existingRow) return null;
    const before = mapAsset(existingRow);

    const result = await client.query<AssetRow>(
      `UPDATE assets SET
         asset_tag = $2, name = $3, category_id = $4, model_number = $5, serial_number = $6,
         location_id = $7, department_id = $8, assigned_user_id = $9, owner_name = $10,
         owner_email = $11, condition_id = $12, status_id = $13, vendor_id = $14,
         purchase_date = $15, purchase_cost = $16, warranty_expiry = $17,
         depreciation_method = $18, useful_life_months = $19, salvage_value = $20, notes = $21
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        input.assetTag,
        input.name,
        input.categoryId,
        input.modelNumber,
        input.serialNumber,
        input.locationId,
        input.departmentId,
        input.assignedUserId,
        input.ownerName,
        input.ownerEmail,
        input.conditionId,
        input.statusId,
        input.vendorId,
        input.purchaseDate,
        input.purchaseCost,
        input.warrantyExpiry,
        input.depreciationMethod,
        input.usefulLifeMonths,
        input.salvageValue,
        input.notes,
      ],
    );
    const after = mapAsset(result.rows[0]);

    for (const field of TRACKED_FIELDS) {
      const oldValue = fieldFromAsset(before, field.column);
      const newValue = field.get(input);
      if (String(oldValue ?? "") === String(newValue ?? "")) continue;
      await client.query(
        `INSERT INTO asset_audit_log (asset_id, action_type, field_name, old_value, new_value, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          AUDIT_ACTION_BY_FIELD[field.column] ?? "updated",
          field.column,
          oldValue != null ? String(oldValue) : null,
          newValue != null ? String(newValue) : null,
          performedBy,
        ],
      );
    }

    return after;
  });
}

export async function setAssetImagePath(id: string, imagePath: string): Promise<Asset | null> {
  const result = await query<AssetRow>(
    `UPDATE assets SET image_path = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING ${SELECT_COLUMNS}`,
    [id, imagePath],
  );
  return result.rows[0] ? mapAsset(result.rows[0]) : null;
}
