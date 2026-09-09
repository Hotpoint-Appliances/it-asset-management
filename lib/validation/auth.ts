export interface LoginInput {
  email: string;
  password: string;
}

export type LoginValidationResult =
  | { success: true; data: LoginInput }
  | { success: false; error: string };

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

  return { success: true, data: { email: email.trim().toLowerCase(), password } };
}
