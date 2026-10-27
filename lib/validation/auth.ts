export interface LoginInput {
  email: string;
  password: string;
}

export type LoginValidationResult =
  { success: true; data: LoginInput } | { success: false; error: string };

export function validateLoginInput(body: unknown): LoginValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return { success: false, error: "A valid email is required" };
  }
  if (typeof password !== "string" || password.length === 0) {
    return { success: false, error: "Password is required" };
  }

  return {
    success: true,
    data: { email: email.trim().toLowerCase(), password },
  };
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export type ChangePasswordValidationResult =
  | { success: true; data: ChangePasswordInput }
  | { success: false; error: string };

/** Same 8-character minimum as the admin user form (lib/validation/users.ts). */
export function validateChangePasswordInput(
  body: unknown,
): ChangePasswordValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { currentPassword, newPassword } = body as Record<string, unknown>;

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return { success: false, error: "Current password is required" };
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return {
      success: false,
      error: "New password must be at least 8 characters",
    };
  }
  if (newPassword === currentPassword) {
    return {
      success: false,
      error: "New password must be different from your current password",
    };
  }

  return { success: true, data: { currentPassword, newPassword } };
}
