export function requireString(
  value: unknown,
  field: string,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: `${field} is required` };
  }
  return { ok: true, value: value.trim() };
}

/** null/undefined/"" all mean "not provided" -> null. Any other non-string is invalid. */
export function optionalString(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() : undefined;
}

/** null/undefined mean "not provided" -> null. Any other non-number is invalid. */
export function optionalNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function requireNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
