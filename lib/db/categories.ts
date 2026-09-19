import { query } from "./query";
import { assertNotReferencedByAssets } from "./refCheck";
import type { Category, CategoryInput } from "@/types/category";

interface CategoryRow {
  id: number;
  name: string;
  parent_category_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parentCategoryId: row.parent_category_id,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `id, name, parent_category_id, description, created_at, updated_at`;

export async function listCategories(): Promise<Category[]> {
  const result = await query<CategoryRow>(
    `SELECT ${SELECT_COLUMNS} FROM categories ORDER BY name`,
  );
  return result.rows.map(mapCategory);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const result = await query<CategoryRow>(
    `INSERT INTO categories (name, parent_category_id, description)
     VALUES ($1, $2, $3)
     RETURNING ${SELECT_COLUMNS}`,
    [input.name, input.parentCategoryId, input.description],
  );
  return mapCategory(result.rows[0]);
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<Category | null> {
  const result = await query<CategoryRow>(
    `UPDATE categories SET name = $2, parent_category_id = $3, description = $4
     WHERE id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [id, input.name, input.parentCategoryId, input.description],
  );
  return result.rows[0] ? mapCategory(result.rows[0]) : null;
}

export async function deleteCategory(id: number): Promise<boolean> {
  await assertNotReferencedByAssets("category_id", id);
  const result = await query(`DELETE FROM categories WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}
