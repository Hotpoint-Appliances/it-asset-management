import { requireString, optionalNumber, requireNumber } from "./helpers";

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  roleId: number;
  departmentId: number | null;
}

export type CreateUserValidationResult =
  | { success: true; data: CreateUserPayload }
  | { success: false; error: string };

export function validateCreateUserInput(body: unknown): CreateUserValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { fullName, email, password, roleId, departmentId } = body as Record<string, unknown>;

  const fullNameResult = requireString(fullName, "Full name");
  if (!fullNameResult.ok) return { success: false, error: fullNameResult.error };

  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return { success: false, error: "A valid email is required" };
  }

  if (typeof password !== "string" || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const roleIdResult = requireNumber(roleId);
  if (roleIdResult === undefined) {
    return { success: false, error: "roleId is required" };
  }

  const departmentIdResult = optionalNumber(departmentId);
  if (departmentIdResult === undefined) {
    return { success: false, error: "departmentId must be a number or null" };
  }

  return {
    success: true,
    data: {
      fullName: fullNameResult.value,
      email: email.trim().toLowerCase(),
      password,
      roleId: roleIdResult,
      departmentId: departmentIdResult,
    },
  };
}

export interface UpdateUserPayload {
  fullName: string;
  email: string;
  roleId: number;
  departmentId: number | null;
  password?: string;
}

export type UpdateUserValidationResult =
  | { success: true; data: UpdateUserPayload }
  | { success: false; error: string };

export function validateUpdateUserInput(body: unknown): UpdateUserValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { fullName, email, roleId, departmentId, password } = body as Record<string, unknown>;

  const fullNameResult = requireString(fullName, "Full name");
  if (!fullNameResult.ok) return { success: false, error: fullNameResult.error };

  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return { success: false, error: "A valid email is required" };
  }

  const roleIdResult = requireNumber(roleId);
  if (roleIdResult === undefined) {
    return { success: false, error: "roleId is required" };
  }

  const departmentIdResult = optionalNumber(departmentId);
  if (departmentIdResult === undefined) {
    return { success: false, error: "departmentId must be a number or null" };
  }

  if (password !== undefined && (typeof password !== "string" || password.length < 8)) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  return {
    success: true,
    data: {
      fullName: fullNameResult.value,
      email: email.trim().toLowerCase(),
      roleId: roleIdResult,
      departmentId: departmentIdResult,
      password: typeof password === "string" ? password : undefined,
    },
  };
}
