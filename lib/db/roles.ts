import { query } from "./query";
import type { Role } from "@/types/user";

export async function listRoles(): Promise<Role[]> {
  const result = await query<Role>(`SELECT id, name, description FROM roles ORDER BY id`);
  return result.rows;
}
