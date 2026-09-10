import {
  requireString,
  optionalString,
  optionalNumber,
  requireNumber,
} from "./helpers";
import type { TransferInput } from "@/lib/db/assets";
import type {
  MaintenanceInput,
  MaintenanceUpdateInput,
} from "@/types/maintenance";
import type { DisposalInput } from "@/types/disposal";

type Result<T> = { success: true; data: T } | { success: false; error: string };

/** Transfer action (phase-5-asset-lifecycle Step 1) — every field is optional (only what the
 * dialog actually changed is sent), but owner fields are dual-mode like the create/edit form:
 * exactly one of assignedUserId/ownerName may be set when the owner is being changed at all. */
export function validateTransferInput(body: unknown): Result<TransferInput> {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;
  const data: TransferInput = {};

  if (b.locationId !== undefined) {
    const locationId = requireNumber(b.locationId);
    if (locationId === undefined)
      return { success: false, error: "locationId must be a number" };
    data.locationId = locationId;
  }
  if (b.departmentId !== undefined) {
    const departmentId = requireNumber(b.departmentId);
    if (departmentId === undefined)
      return { success: false, error: "departmentId must be a number" };
    data.departmentId = departmentId;
  }

  const ownerModeTouched =
    b.assignedUserId !== undefined || b.ownerName !== undefined;
  if (ownerModeTouched) {
    const assignedUserId = optionalString(b.assignedUserId);
    if (assignedUserId === undefined) {
      return {
        success: false,
        error: "assignedUserId must be a string or null",
      };
    }
    const ownerName = optionalString(b.ownerName);
    if (ownerName === undefined)
      return { success: false, error: "ownerName must be a string or null" };
    const ownerEmail = optionalString(b.ownerEmail);
    if (ownerEmail === undefined) {
      return { success: false, error: "ownerEmail must be a string or null" };
    }
    if (!assignedUserId && !ownerName) {
      return {
        success: false,
        error: "Either an assigned user or an owner name is required",
      };
    }
    data.assignedUserId = assignedUserId;
    data.ownerName = ownerName;
    data.ownerEmail = ownerEmail;
  }

  if (
    data.locationId === undefined &&
    data.departmentId === undefined &&
    !ownerModeTouched
  ) {
    return {
      success: false,
      error: "At least one of location, department, or owner is required",
    };
  }

  return { success: true, data };
}

export function validateMaintenanceInput(
  body: unknown,
): Result<MaintenanceInput> {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  const maintenanceType = requireString(b.maintenanceType, "Maintenance type");
  if (!maintenanceType.ok)
    return { success: false, error: maintenanceType.error };
  if (!["repair", "service", "inspection"].includes(maintenanceType.value)) {
    return {
      success: false,
      error: "maintenanceType must be repair, service, or inspection",
    };
  }
  const vendorId = optionalNumber(b.vendorId);
  if (vendorId === undefined)
    return { success: false, error: "vendorId must be a number or null" };
  const scheduledDate = optionalString(b.scheduledDate);
  if (scheduledDate === undefined) {
    return { success: false, error: "scheduledDate must be a string or null" };
  }
  const notes = optionalString(b.notes);
  if (notes === undefined)
    return { success: false, error: "notes must be a string or null" };

  return {
    success: true,
    data: {
      maintenanceType:
        maintenanceType.value as MaintenanceInput["maintenanceType"],
      vendorId,
      scheduledDate,
      notes,
    },
  };
}

export function validateMaintenanceUpdateInput(
  body: unknown,
): Result<MaintenanceUpdateInput> {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  const status = requireString(b.status, "Status");
  if (!status.ok) return { success: false, error: status.error };
  if (
    !["scheduled", "in_progress", "completed", "cancelled"].includes(
      status.value,
    )
  ) {
    return {
      success: false,
      error: "status must be scheduled, in_progress, completed, or cancelled",
    };
  }
  const completedDate = optionalString(b.completedDate);
  if (completedDate === undefined) {
    return { success: false, error: "completedDate must be a string or null" };
  }
  const cost = optionalNumber(b.cost);
  if (cost === undefined)
    return { success: false, error: "cost must be a number or null" };
  const notes = optionalString(b.notes);
  if (notes === undefined)
    return { success: false, error: "notes must be a string or null" };

  return {
    success: true,
    data: {
      status: status.value as MaintenanceUpdateInput["status"],
      completedDate,
      cost,
      notes,
    },
  };
}

const DISPOSAL_METHODS = new Set([
  "sold",
  "scrapped",
  "donated",
  "lost",
  "stolen",
  "other",
]);

export function validateDisposalInput(body: unknown): Result<DisposalInput> {
  if (typeof body !== "object" || body === null) {
    return { success: false, error: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  const disposalDate = requireString(b.disposalDate, "Disposal date");
  if (!disposalDate.ok) return { success: false, error: disposalDate.error };
  const disposalMethod = requireString(b.disposalMethod, "Disposal method");
  if (!disposalMethod.ok)
    return { success: false, error: disposalMethod.error };
  if (!DISPOSAL_METHODS.has(disposalMethod.value)) {
    return {
      success: false,
      error:
        "disposalMethod must be one of sold/scrapped/donated/lost/stolen/other",
    };
  }
  const disposalValue = optionalNumber(b.disposalValue);
  if (disposalValue === undefined) {
    return { success: false, error: "disposalValue must be a number or null" };
  }
  const notes = optionalString(b.notes);
  if (notes === undefined)
    return { success: false, error: "notes must be a string or null" };

  return {
    success: true,
    data: {
      disposalDate: disposalDate.value,
      disposalMethod: disposalMethod.value as DisposalInput["disposalMethod"],
      disposalValue,
      notes,
    },
  };
}

/** The disposal dialog posts multipart/form-data (fields + an optional attachment file share one
 * request, same pattern as phase-4's asset create/edit) — normalizes it for
 * validateDisposalInput. */
export function disposalInputFromFormData(
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
    disposalDate: str("disposalDate"),
    disposalMethod: str("disposalMethod"),
    disposalValue: num("disposalValue"),
    notes: str("notes"),
  };
}
