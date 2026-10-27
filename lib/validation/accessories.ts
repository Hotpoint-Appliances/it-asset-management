import { requireString, optionalString, optionalNumber } from "./helpers";
import { MAX_ACCESSORY_QUANTITY } from "@/lib/assetAccessories";
import type { AccessoryInput, AssetAccessoryInput } from "@/types/accessory";

export type AccessoryValidationResult =
  { success: true; data: AccessoryInput } | { success: false; error: string };

export function validateAccessoryInput(
  body: unknown,
): AccessoryValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  const name = requireString(b.name, "Name");
  if (!name.ok) return { success: false, error: name.error };
  if (name.value.length > 100) {
    return { success: false, error: "Name must be 100 characters or fewer" };
  }

  const description = optionalString(b.description);
  if (description === undefined) {
    return { success: false, error: "description must be a string or null" };
  }

  if (b.isActive !== undefined && typeof b.isActive !== "boolean") {
    return { success: false, error: "isActive must be a boolean" };
  }

  const sortOrder = optionalNumber(b.sortOrder);
  if (sortOrder === undefined) {
    return { success: false, error: "sortOrder must be a number" };
  }

  return {
    success: true,
    data: {
      name: name.value,
      description,
      isActive: b.isActive ?? true,
      sortOrder: sortOrder ?? 0,
    },
  };
}

export type AssetAccessoriesValidationResult =
  | { success: true; data: AssetAccessoryInput[] }
  | { success: false; error: string };

/** An asset's full accessory list, as submitted by the asset form (inside its multipart body)
 * and the detail page's Accessories tab (JSON). Each accessory may appear once. */
export function validateAssetAccessories(
  value: unknown,
): AssetAccessoriesValidationResult {
  if (!Array.isArray(value)) {
    return { success: false, error: "accessories must be an array" };
  }
  const seen = new Set<number>();
  const data: AssetAccessoryInput[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return { success: false, error: "Invalid accessory entry" };
    }
    const { accessoryId, quantity, notes } = item as Record<string, unknown>;
    if (!Number.isInteger(accessoryId)) {
      return { success: false, error: "Select an accessory for every row" };
    }
    if (seen.has(accessoryId as number)) {
      return { success: false, error: "Each accessory can only be added once" };
    }
    seen.add(accessoryId as number);
    if (
      !Number.isInteger(quantity) ||
      (quantity as number) < 1 ||
      (quantity as number) > MAX_ACCESSORY_QUANTITY
    ) {
      return {
        success: false,
        error: `Accessory quantity must be a whole number from 1 to ${MAX_ACCESSORY_QUANTITY}`,
      };
    }
    const note = optionalString(notes);
    if (note === undefined) {
      return { success: false, error: "Accessory notes must be a string" };
    }
    data.push({
      accessoryId: accessoryId as number,
      quantity: quantity as number,
      notes: note,
    });
  }
  return { success: true, data };
}

/** The asset form posts its accessory list as a JSON string field of the multipart body. null
 * means the field wasn't sent, which leaves an existing asset's accessories untouched. */
export function assetAccessoriesFromFormData(
  formData: FormData,
): AssetAccessoriesValidationResult | null {
  const raw = formData.get("accessories");
  if (raw === null) return null;
  if (typeof raw !== "string") {
    return { success: false, error: "accessories must be a JSON string" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: "accessories must be valid JSON" };
  }
  return validateAssetAccessories(parsed);
}
