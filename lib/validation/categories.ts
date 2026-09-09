import { requireString, optionalNumber, optionalString } from "./helpers";
import type { CategoryInput } from "@/types/category";

export type CategoryValidationResult =
  | { success: true; data: CategoryInput }
  | { success: false; error: string };

export function validateCategoryInput(body: unknown): CategoryValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { name, parentCategoryId, description } = body as Record<string, unknown>;

  const nameResult = requireString(name, "Name");
  if (!nameResult.ok) return { success: false, error: nameResult.error };

  const parentCategoryIdResult = optionalNumber(parentCategoryId);
  if (parentCategoryIdResult === undefined) {
    return { success: false, error: "parentCategoryId must be a number or null" };
  }

  const descriptionResult = optionalString(description);
  if (descriptionResult === undefined) {
    return { success: false, error: "description must be a string or null" };
  }

  return {
    success: true,
    data: {
      name: nameResult.value,
      parentCategoryId: parentCategoryIdResult,
      description: descriptionResult,
    },
  };
}
