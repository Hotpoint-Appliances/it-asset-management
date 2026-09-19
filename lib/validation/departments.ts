import { requireString, optionalString } from "./helpers";
import type { DepartmentInput } from "@/types/department";

export type DepartmentValidationResult =
  { success: true; data: DepartmentInput } | { success: false; error: string };

export function validateDepartmentInput(
  body: unknown,
): DepartmentValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { name, code } = body as Record<string, unknown>;

  const nameResult = requireString(name, "Name");
  if (!nameResult.ok) return { success: false, error: nameResult.error };

  const codeResult = optionalString(code);
  if (codeResult === undefined) {
    return { success: false, error: "code must be a string or null" };
  }

  return { success: true, data: { name: nameResult.value, code: codeResult } };
}
