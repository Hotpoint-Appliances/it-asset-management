import { requireString, optionalNumber, optionalString } from "./helpers";
import type { LocationInput } from "@/types/location";

export type LocationValidationResult =
  | { success: true; data: LocationInput }
  | { success: false; error: string };

export function validateLocationInput(body: unknown): LocationValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { name, parentLocationId, address } = body as Record<string, unknown>;

  const nameResult = requireString(name, "Name");
  if (!nameResult.ok) return { success: false, error: nameResult.error };

  const parentLocationIdResult = optionalNumber(parentLocationId);
  if (parentLocationIdResult === undefined) {
    return { success: false, error: "parentLocationId must be a number or null" };
  }

  const addressResult = optionalString(address);
  if (addressResult === undefined) {
    return { success: false, error: "address must be a string or null" };
  }

  return {
    success: true,
    data: {
      name: nameResult.value,
      parentLocationId: parentLocationIdResult,
      address: addressResult,
    },
  };
}
