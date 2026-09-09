import { query } from "./query";
import type { RoleName } from "@/lib/auth/session";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  roleId: number;
  roleName: RoleName;
  departmentId: number | null;
  isActive: boolean;
}

interface AuthUserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role_id: number;
  role_name: RoleName;
  department_id: number | null;
  is_active: boolean;
}

function mapAuthUser(row: AuthUserRow): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    roleId: row.role_id,
    roleName: row.role_name,
    departmentId: row.department_id,
    isActive: row.is_active,
  };
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const result = await query<AuthUserRow>(
    `SELECT u.id, u.full_name, u.email, u.password_hash, u.role_id,
            r.name AS role_name, u.department_id, u.is_active
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email],
  );
  const row = result.rows[0];
  return row ? mapAuthUser(row) : null;
}

export async function touchLastLogin(userId: string): Promise<void> {
  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  roleName: RoleName;
  departmentId: number | null;
  isActive: boolean;
}

interface UserSummaryRow {
  id: string;
  full_name: string;
  email: string;
  role_name: RoleName;
  department_id: number | null;
  is_active: boolean;
}

/**
 * Lists users. Admin/asset_manager see everyone; viewers are scoped to their own
 * department at the query layer, per the RBAC rules in itam-conventions.
 */
export async function listUsers(requester: {
  roleName: RoleName;
  departmentId: number | null;
}): Promise<UserSummary[]> {
  const isScoped = requester.roleName === "viewer";
  const result = await query<UserSummaryRow>(
    `SELECT u.id, u.full_name, u.email, r.name AS role_name, u.department_id, u.is_active
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE ($1::boolean IS FALSE OR u.department_id = $2)
     ORDER BY u.full_name`,
    [isScoped, requester.departmentId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    roleName: row.role_name,
    departmentId: row.department_id,
    isActive: row.is_active,
  }));
}
