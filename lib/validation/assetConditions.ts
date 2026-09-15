import { requireString, optionalNumber } from "./helpers";
import type { AssetConditionInput } from "@/types/assetCondition";

export type AssetConditionValidationResult =
  | { success: true; data: AssetConditionInput }
  | { success: false; error: string };

export function validateAssetConditionInput(
  body: unknown,
): AssetConditionValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { name, sortOrder } = body as Record<string, unknown>;

  const nameResult = requireString(name, "Name");
  if (!nameResult.ok) return { success: false, error: nameResult.error };

  const sortOrderResult = optionalNumber(sortOrder);
  if (sortOrderResult === undefined) {
    return { success: false, error: "sortOrder must be a number" };
  }

  return {
    success: true,
    data: { name: nameResult.value, sortOrder: sortOrderResult ?? 0 },
  };
}
