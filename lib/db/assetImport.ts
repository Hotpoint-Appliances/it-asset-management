import { query } from "./query";

export interface ImportLookupRow {
  id: number;
  name: string;
  parentId: number | null;
}

export interface ImportUser {
  id: string;
  email: string;
  fullName: string;
}

/** Everything the Excel import resolves names against, unpaginated (the settings lists cap at a
 * page). Users are active ones only: an import can't assign an asset to a deactivated login. */
export interface ImportLookups {
  categories: ImportLookupRow[];
  locations: ImportLookupRow[];
  departments: ImportLookupRow[];
  vendors: ImportLookupRow[];
  conditions: ImportLookupRow[];
  statuses: ImportLookupRow[];
  users: ImportUser[];
}

export async function loadImportLookups(): Promise<ImportLookups> {
  const [categories, locations, departments, vendors, conditions, statuses] =
    await Promise.all(
      [
        `SELECT id, name, parent_category_id AS parent_id FROM categories`,
        `SELECT id, name, parent_location_id AS parent_id FROM locations`,
        `SELECT id, name, NULL::int AS parent_id FROM departments`,
        `SELECT id, name, NULL::int AS parent_id FROM vendors`,
        `SELECT id, name, NULL::int AS parent_id FROM asset_conditions ORDER BY sort_order, name`,
        `SELECT id, name, NULL::int AS parent_id FROM asset_statuses ORDER BY sort_order, name`,
      ].map(async (sql) => {
        const result = await query<{
          id: number;
          name: string;
          parent_id: number | null;
        }>(sql);
        return result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          parentId: r.parent_id,
        }));
      }),
    );
  const users = await query<{ id: string; email: string; full_name: string }>(
    `SELECT id, email, full_name FROM users WHERE is_active ORDER BY full_name`,
  );
  return {
    categories,
    locations,
    departments,
    vendors,
    conditions,
    statuses,
    users: users.rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
    })),
  };
}

/** Lower-cased asset tags already in use, soft-deleted assets included: the UNIQUE constraint
 * still covers them. Compared case-insensitively so "LT-001" and "lt-001" can't coexist. */
export async function findExistingAssetTags(
  tags: string[],
): Promise<Set<string>> {
  if (!tags.length) return new Set();
  const result = await query<{ tag: string }>(
    `SELECT lower(asset_tag) AS tag FROM assets WHERE lower(asset_tag) = ANY($1)`,
    [tags.map((t) => t.toLowerCase())],
  );
  return new Set(result.rows.map((r) => r.tag));
}

/** Lower-cased serial number -> the asset tag already using it (live assets only). */
export async function findExistingSerialNumbers(
  serials: string[],
): Promise<Map<string, string>> {
  if (!serials.length) return new Map();
  const result = await query<{ serial: string; asset_tag: string }>(
    `SELECT lower(serial_number) AS serial, asset_tag FROM assets
     WHERE deleted_at IS NULL AND lower(serial_number) = ANY($1)`,
    [serials.map((s) => s.toLowerCase())],
  );
  return new Map(result.rows.map((r) => [r.serial, r.asset_tag]));
}
