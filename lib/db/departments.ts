import { query } from "./query";
import { assertNotReferencedByAssets } from "./refCheck";
import type { Department, DepartmentInput } from "@/types/department";

interface DepartmentRow {
  id: number;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
}

function mapDepartment(row: DepartmentRow): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `id, name, code, created_at, updated_at`;

export interface PageResult<T> {
  items: T[];
  total: number;
}

export async function listDepartments(limit = 100, offset = 0): Promise<PageResult<Department>> {
  const [rows, count] = await Promise.all([
    query<DepartmentRow>(
      `SELECT ${SELECT_COLUMNS} FROM departments ORDER BY name LIMIT $1 OFFSET $2`,
      [limit, offset],
    ),
    query<{ count: string }>(`SELECT count(*) FROM departments`),
  ]);
  return { items: rows.rows.map(mapDepartment), total: Number(count.rows[0].count) };
}

export async function createDepartment(input: DepartmentInput): Promise<Department> {
  const result = await query<DepartmentRow>(
    `INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING ${SELECT_COLUMNS}`,
    [input.name, input.code],
  );
  return mapDepartment(result.rows[0]);
}

export async function updateDepartment(
  id: number,
  input: DepartmentInput,
): Promise<Department | null> {
  const result = await query<DepartmentRow>(
    `UPDATE departments SET name = $2, code = $3 WHERE id = $1 RETURNING ${SELECT_COLUMNS}`,
    [id, input.name, input.code],
  );
  return result.rows[0] ? mapDepartment(result.rows[0]) : null;
}

export async function deleteDepartment(id: number): Promise<boolean> {
  await assertNotReferencedByAssets("department_id", id);
  const result = await query(`DELETE FROM departments WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
