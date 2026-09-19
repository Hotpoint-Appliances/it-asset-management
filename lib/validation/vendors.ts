import { requireString, optionalString } from "./helpers";
import type { VendorInput } from "@/types/vendor";

export type VendorValidationResult =
  { success: true; data: VendorInput } | { success: false; error: string };

export function validateVendorInput(body: unknown): VendorValidationResult {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const { name, contactName, contactEmail, contactPhone, address } =
    body as Record<string, unknown>;

  const nameResult = requireString(name, "Name");
  if (!nameResult.ok) return { success: false, error: nameResult.error };

  const contactNameResult = optionalString(contactName);
  if (contactNameResult === undefined) {
    return { success: false, error: "contactName must be a string or null" };
  }
  const contactEmailResult = optionalString(contactEmail);
  if (
    contactEmailResult === undefined ||
    (contactEmailResult && !contactEmailResult.includes("@"))
  ) {
    return {
      success: false,
      error: "contactEmail must be a valid email or null",
    };
  }
  const contactPhoneResult = optionalString(contactPhone);
  if (contactPhoneResult === undefined) {
    return { success: false, error: "contactPhone must be a string or null" };
  }
  const addressResult = optionalString(address);
  if (addressResult === undefined) {
    return { success: false, error: "address must be a string or null" };
  }

  return {
    success: true,
    data: {
      name: nameResult.value,
      contactName: contactNameResult,
      contactEmail: contactEmailResult,
      contactPhone: contactPhoneResult,
      address: addressResult,
    },
  };
}
