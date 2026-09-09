import { query } from "./query";
import { assertNotReferencedByAssets } from "./refCheck";
import type { Location, LocationInput } from "@/types/location";

interface LocationRow {
  id: number;
  name: string;
  parent_location_id: number | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

function mapLocation(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    parentLocationId: row.parent_location_id,
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `id, name, parent_location_id, address, created_at, updated_at`;

export async function listLocations(): Promise<Location[]> {
  const result = await query<LocationRow>(
    `SELECT ${SELECT_COLUMNS} FROM locations ORDER BY name`,
  );
  return result.rows.map(mapLocation);
}

export async function createLocation(input: LocationInput): Promise<Location> {
  const result = await query<LocationRow>(
    `INSERT INTO locations (name, parent_location_id, address)
     VALUES ($1, $2, $3)
     RETURNING ${SELECT_COLUMNS}`,
    [input.name, input.parentLocationId, input.address],
  );
  return mapLocation(result.rows[0]);
}

export async function updateLocation(
  id: number,
  input: LocationInput,
): Promise<Location | null> {
  const result = await query<LocationRow>(
    `UPDATE locations SET name = $2, parent_location_id = $3, address = $4
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [id, input.name, input.parentLocationId, input.address],
  );
  return result.rows[0] ? mapLocation(result.rows[0]) : null;
}

export async function deleteLocation(id: number): Promise<boolean> {
  await assertNotReferencedByAssets("location_id", id);
  const result = await query(`DELETE FROM locations WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
