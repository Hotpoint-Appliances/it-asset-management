import {
  requireString,
  optionalString,
  optionalNumber,
  requireNumber,
} from "./helpers";
import type { AssetInput } from "@/types/asset";

export type AssetValidationResult =
  { success: true; data: AssetInput } | { success: false; error: string };

const DEPRECIATION_METHODS = new Set(["straight_line", "declining_balance"]);

export function validateAssetInput(body: unknown): AssetValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  const assetTag = requireString(b.assetTag, "Asset tag");
  if (!assetTag.ok) return { success: false, error: assetTag.error };
  const name = requireString(b.name, "Name");
  if (!name.ok) return { success: false, error: name.error };

  const categoryId = requireNumber(b.categoryId);
  if (categoryId === undefined)
    return { success: false, error: "Category is required" };
  const locationId = requireNumber(b.locationId);
  if (locationId === undefined)
    return { success: false, error: "Location is required" };
  const departmentId = requireNumber(b.departmentId);
  if (departmentId === undefined)
    return { success: false, error: "Department is required" };
  const conditionId = requireNumber(b.conditionId);
  if (conditionId === undefined)
    return { success: false, error: "Condition is required" };
  const statusId = requireNumber(b.statusId);
  if (statusId === undefined)
    return { success: false, error: "Status is required" };

  const modelNumber = optionalString(b.modelNumber);
  if (modelNumber === undefined) {
    return { success: false, error: "modelNumber must be a string or null" };
  }
  const serialNumber = optionalString(b.serialNumber);
  if (serialNumber === undefined) {
    return { success: false, error: "serialNumber must be a string or null" };
  }

  const assignedUserId = optionalString(b.assignedUserId);
  if (assignedUserId === undefined) {
    return { success: false, error: "assignedUserId must be a string or null" };
  }
  const ownerName = optionalString(b.ownerName);
  if (ownerName === undefined) {
    return { success: false, error: "ownerName must be a string or null" };
  }
  const ownerEmail = optionalString(b.ownerEmail);
  if (ownerEmail === undefined) {
    return { success: false, error: "ownerEmail must be a string or null" };
  }
  // chk_asset_owner: at least one of assigned_user_id / owner_name must be set — enforced here
  // too so the caller gets a clean 400 instead of a raw DB constraint failure.
  if (!assignedUserId && !ownerName) {
    return {
      success: false,
      error: "Either an assigned user or an owner name is required",
    };
  }

  const vendorId = optionalNumber(b.vendorId);
  if (vendorId === undefined)
    return { success: false, error: "vendorId must be a number or null" };

  const purchaseDate = optionalString(b.purchaseDate);
  if (purchaseDate === undefined) {
    return { success: false, error: "purchaseDate must be a string or null" };
  }
  const purchaseCost = optionalNumber(b.purchaseCost);
  if (purchaseCost === undefined) {
    return { success: false, error: "purchaseCost must be a number or null" };
  }
  const warrantyExpiry = optionalString(b.warrantyExpiry);
  if (warrantyExpiry === undefined) {
    return { success: false, error: "warrantyExpiry must be a string or null" };
  }

  const depreciationMethodRaw = optionalString(b.depreciationMethod);
  if (depreciationMethodRaw === undefined) {
    return {
      success: false,
      error: "depreciationMethod must be a string or null",
    };
  }
  if (
    depreciationMethodRaw &&
    !DEPRECIATION_METHODS.has(depreciationMethodRaw)
  ) {
    return {
      success: false,
      error: "depreciationMethod must be straight_line or declining_balance",
    };
  }
  const usefulLifeMonths = optionalNumber(b.usefulLifeMonths);
  if (usefulLifeMonths === undefined) {
    return {
      success: false,
      error: "usefulLifeMonths must be a number or null",
    };
  }
  const salvageValue = optionalNumber(b.salvageValue);
  if (salvageValue === undefined) {
    return { success: false, error: "salvageValue must be a number or null" };
  }

  const notes = optionalString(b.notes);
  if (notes === undefined)
    return { success: false, error: "notes must be a string or null" };

  return {
    success: true,
    data: {
      assetTag: assetTag.value,
      name: name.value,
      categoryId,
      modelNumber,
      serialNumber,
      locationId,
      departmentId,
      assignedUserId,
      ownerName,
      ownerEmail,
      conditionId,
      statusId,
      vendorId,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      depreciationMethod: (depreciationMethodRaw ||
        null) as AssetInput["depreciationMethod"],
      usefulLifeMonths,
      salvageValue,
      notes,
    },
  };
}

/** The create/edit form posts multipart/form-data (fields + an optional image file share one
 * request) — this normalizes it into the same shape validateAssetInput expects from a JSON
 * body, so there's one validator for both entry points. */
export function assetInputFromFormData(
  formData: FormData,
): Record<string, unknown> {
  const str = (key: string): string | null => {
    const value = formData.get(key);
    return typeof value === "string" && value !== "" ? value : null;
  };
  const num = (key: string): number | null => {
    const value = str(key);
    return value === null ? null : Number(value);
  };
  return {
    assetTag: str("assetTag"),
    name: str("name"),
    categoryId: num("categoryId"),
    modelNumber: str("modelNumber"),
    serialNumber: str("serialNumber"),
    locationId: num("locationId"),
    departmentId: num("departmentId"),
    assignedUserId: str("assignedUserId"),
    ownerName: str("ownerName"),
    ownerEmail: str("ownerEmail"),
    conditionId: num("conditionId"),
    statusId: num("statusId"),
    vendorId: num("vendorId"),
    purchaseDate: str("purchaseDate"),
    purchaseCost: num("purchaseCost"),
    warrantyExpiry: str("warrantyExpiry"),
    depreciationMethod: str("depreciationMethod"),
    usefulLifeMonths: num("usefulLifeMonths"),
    salvageValue: num("salvageValue"),
    notes: str("notes"),
  };
}
