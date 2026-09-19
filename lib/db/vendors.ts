import { query } from "./query";
import { assertNotReferencedByAssets } from "./refCheck";
import type { Vendor, VendorInput } from "@/types/vendor";
import type { PageResult } from "./departments";

interface VendorRow {
  id: number;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

function mapVendor(row: VendorRow): Vendor {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `id, name, contact_name, contact_email, contact_phone, address, created_at, updated_at`;

export async function listVendors(
  limit = 100,
  offset = 0,
): Promise<PageResult<Vendor>> {
  const [rows, count] = await Promise.all([
    query<VendorRow>(
      `SELECT ${SELECT_COLUMNS} FROM vendors ORDER BY name LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    query<{ count: string }>(`SELECT count(*) FROM vendors`),
  ]);
  return {
    items: rows.rows.map(mapVendor),
    total: Number(count.rows[0].count),
  };
}

export async function createVendor(input: VendorInput): Promise<Vendor> {
  const result = await query<VendorRow>(
    `INSERT INTO vendors (name, contact_name, contact_email, contact_phone, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SELECT_COLUMNS}`,
    [
      input.name,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.address,
    ],
  );
  return mapVendor(result.rows[0]);
}

export async function updateVendor(
  id: number,
  input: VendorInput,
): Promise<Vendor | null> {
  const result = await query<VendorRow>(
    `UPDATE vendors SET name = $2, contact_name = $3, contact_email = $4, contact_phone = $5, address = $6
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [
      id,
      input.name,
      input.contactName,
      input.contactEmail,
      input.contactPhone,
      input.address,
    ],
  );
  return result.rows[0] ? mapVendor(result.rows[0]) : null;
}

export async function deleteVendor(id: number): Promise<boolean> {
  await assertNotReferencedByAssets("vendor_id", id);
  const result = await query(`DELETE FROM vendors WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
