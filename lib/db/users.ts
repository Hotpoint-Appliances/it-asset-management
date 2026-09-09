import { query } from "./query";
import { hashPassword } from "@/lib/auth/password";
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

function mapUserSummary(row: UserSummaryRow): UserSummary {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    roleName: row.role_name,
    departmentId: row.department_id,
    isActive: row.is_active,
  };
}

const USER_SUMMARY_COLUMNS = `u.id, u.full_name, u.email, r.name AS role_name, u.department_id, u.is_active`;
const ROLE_JOIN = `JOIN roles r ON r.id = u.role_id`;

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
    `SELECT ${USER_SUMMARY_COLUMNS}
     FROM users u ${ROLE_JOIN}
     WHERE ($1::boolean IS FALSE OR u.department_id = $2)
     ORDER BY u.full_name`,
    [isScoped, requester.departmentId],
  );
  return result.rows.map(mapUserSummary);
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  roleId: number;
  departmentId: number | null;
}

export async function createUser(input: CreateUserInput): Promise<UserSummary> {
  const passwordHash = await hashPassword(input.password);
  const result = await query<UserSummaryRow>(
    `WITH inserted AS (
       INSERT INTO users (full_name, email, password_hash, role_id, department_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role_id, department_id, is_active
     )
     SELECT ${USER_SUMMARY_COLUMNS} FROM inserted u ${ROLE_JOIN}`,
    [input.fullName, input.email, passwordHash, input.roleId, input.departmentId],
  );
  return mapUserSummary(result.rows[0]);
}

export interface UpdateUserInput {
  fullName: string;
  email: string;
  roleId: number;
  departmentId: number | null;
  /** Leave undefined to keep the existing password unchanged. */
  password?: string;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<UserSummary | null> {
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const result = await query<UserSummaryRow>(
    `WITH updated AS (
       UPDATE users
       SET full_name = $2, email = $3, role_id = $4, department_id = $5,
           password_hash = COALESCE($6, password_hash)
       WHERE id = $1
       RETURNING id, full_name, email, role_id, department_id, is_active
     )
     SELECT ${USER_SUMMARY_COLUMNS} FROM updated u ${ROLE_JOIN}`,
    [id, input.fullName, input.email, input.roleId, input.departmentId, passwordHash],
  );
  return result.rows[0] ? mapUserSummary(result.rows[0]) : null;
}

export async function setUserActive(id: string, isActive: boolean): Promise<UserSummary | null> {
  const result = await query<UserSummaryRow>(
    `WITH updated AS (
       UPDATE users SET is_active = $2 WHERE id = $1
       RETURNING id, full_name, email, role_id, department_id, is_active
     )
     SELECT ${USER_SUMMARY_COLUMNS} FROM updated u ${ROLE_JOIN}`,
    [id, isActive],
  );
  return result.rows[0] ? mapUserSummary(result.rows[0]) : null;
}

export async function getUserById(id: string): Promise<UserSummary | null> {
  const result = await query<UserSummaryRow>(
    `SELECT ${USER_SUMMARY_COLUMNS} FROM users u ${ROLE_JOIN} WHERE u.id = $1`,
    [id],
  );
  return result.rows[0] ? mapUserSummary(result.rows[0]) : null;
}
