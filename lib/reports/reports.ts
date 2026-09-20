import type { AssetRequester } from "@/lib/db/assets";
import {
  listAssetRegister,
  listAuditForExport,
  listDisposalRegister,
  listDepreciableAssets,
  type ExportFilters,
  type AuditExportFilters,
} from "@/lib/db/reports";
import { computeStraightLine } from "./depreciation";
import {
  addSheet,
  createWorkbook,
  dateCell,
  dateTimeCell,
  lookupCell,
  todayIso,
  KES_FORMAT,
  DATE_FORMAT,
  DATETIME_FORMAT,
} from "./workbook";

/** One builder per report (phase-6): each runs its scoped export query and returns a finished
 * workbook, leaving the HTTP concerns (auth, params, Content-Disposition) to the route handler. */

function scopeLine(requester: AssetRequester): string {
  return requester.roleName === "viewer"
    ? "Scope: your department only"
    : "Scope: all departments";
}

export async function buildAssetRegisterWorkbook(
  filters: ExportFilters,
  requester: AssetRequester,
) {
  const rows = await listAssetRegister(filters, requester);
  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Asset register",
    [
      { header: "Asset tag", key: "assetTag", width: 16 },
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "categoryName", width: 20 },
      { header: "Model", key: "modelNumber", width: 18 },
      { header: "Serial number", key: "serialNumber", width: 20 },
      { header: "Location", key: "locationName", width: 22 },
      { header: "Department", key: "departmentName", width: 20 },
      { header: "Owner", key: "ownerName", width: 22 },
      { header: "Owner email", key: "ownerEmail", width: 26 },
      { header: "Condition", key: "conditionName", width: 12 },
      { header: "Status", key: "statusName", width: 12 },
      { header: "Vendor", key: "vendorName", width: 20 },
      {
        header: "Purchase date",
        key: "purchaseDate",
        width: 14,
        numFmt: DATE_FORMAT,
      },
      {
        header: "Purchase cost",
        key: "purchaseCost",
        width: 16,
        numFmt: KES_FORMAT,
      },
      {
        header: "Warranty expiry",
        key: "warrantyExpiry",
        width: 15,
        numFmt: DATE_FORMAT,
      },
      { header: "Depreciation method", key: "depreciationMethod", width: 18 },
      { header: "Useful life (months)", key: "usefulLifeMonths", width: 18 },
      {
        header: "Salvage value",
        key: "salvageValue",
        width: 16,
        numFmt: KES_FORMAT,
      },
      { header: "Notes", key: "notes", width: 36 },
      { header: "Created by", key: "createdByName", width: 20 },
      {
        header: "Created",
        key: "createdAt",
        width: 18,
        numFmt: DATETIME_FORMAT,
      },
    ],
    rows.map((r) => ({
      ...r,
      conditionName: lookupCell(r.conditionName),
      statusName: lookupCell(r.statusName),
      depreciationMethod: lookupCell(r.depreciationMethod),
      purchaseDate: dateCell(r.purchaseDate),
      warrantyExpiry: dateCell(r.warrantyExpiry),
      createdAt: dateTimeCell(r.createdAt),
    })),
    [
      "Asset register",
      `Generated ${todayIso()} · ${rows.length} asset${rows.length === 1 ? "" : "s"} · ${scopeLine(requester)}`,
    ],
  );
  return workbook;
}

export async function buildAuditTrailWorkbook(
  filters: AuditExportFilters,
  requester: AssetRequester,
) {
  const rows = await listAuditForExport(filters, requester);
  const workbook = createWorkbook();
  const range =
    filters.from || filters.to
      ? `${filters.from ?? "start"} to ${filters.to ?? "today"}`
      : "all dates";
  addSheet(
    workbook,
    "Audit trail",
    [
      {
        header: "When",
        key: "performedAt",
        width: 18,
        numFmt: DATETIME_FORMAT,
      },
      { header: "Asset tag", key: "assetTag", width: 16 },
      { header: "Asset", key: "assetName", width: 28 },
      { header: "Action", key: "actionType", width: 18 },
      { header: "Field", key: "fieldName", width: 18 },
      { header: "Old value", key: "oldValue", width: 26 },
      { header: "New value", key: "newValue", width: 26 },
      { header: "Note", key: "note", width: 36 },
      { header: "Performed by", key: "performedByName", width: 22 },
    ],
    rows.map((r) => ({
      ...r,
      performedAt: dateTimeCell(r.performedAt),
      actionType: lookupCell(r.actionType),
      fieldName: r.fieldName?.replace(/_id$/, "").replace(/_/g, " ") ?? null,
      // status names in old/new values read like the UI ("in repair")
      oldValue:
        r.fieldName === "status_id" ? lookupCell(r.oldValue) : r.oldValue,
      newValue:
        r.fieldName === "status_id" ? lookupCell(r.newValue) : r.newValue,
    })),
    [
      "Audit trail",
      `Generated ${todayIso()} · ${rows.length} event${rows.length === 1 ? "" : "s"} · ${filters.assetId ? "single asset" : "all assets"} · ${range} · ${scopeLine(requester)}`,
    ],
  );
  return workbook;
}

export async function buildDisposalRegisterWorkbook(requester: AssetRequester) {
  const rows = await listDisposalRegister(requester);
  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Disposal register",
    [
      { header: "Asset tag", key: "assetTag", width: 16 },
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "categoryName", width: 20 },
      { header: "Department", key: "departmentName", width: 20 },
      { header: "Location", key: "locationName", width: 22 },
      {
        header: "Purchase date",
        key: "purchaseDate",
        width: 14,
        numFmt: DATE_FORMAT,
      },
      {
        header: "Purchase cost",
        key: "purchaseCost",
        width: 16,
        numFmt: KES_FORMAT,
      },
      {
        header: "Disposal date",
        key: "disposalDate",
        width: 14,
        numFmt: DATE_FORMAT,
      },
      { header: "Method", key: "disposalMethod", width: 12 },
      {
        header: "Disposal value",
        key: "disposalValue",
        width: 16,
        numFmt: KES_FORMAT,
      },
      { header: "Approved by", key: "approvedByName", width: 22 },
      { header: "Notes", key: "notes", width: 36 },
      { header: "Document on file", key: "hasAttachment", width: 16 },
    ],
    rows.map((r) => ({
      ...r,
      purchaseDate: dateCell(r.purchaseDate),
      disposalDate: dateCell(r.disposalDate),
      disposalMethod: lookupCell(r.disposalMethod),
      hasAttachment: r.hasAttachment ? "Yes" : "No",
    })),
    [
      "Disposal register",
      `Generated ${todayIso()} · ${rows.length} disposal${rows.length === 1 ? "" : "s"} · ${scopeLine(requester)}`,
    ],
  );
  return workbook;
}

export async function buildDepreciationWorkbook(requester: AssetRequester) {
  const asOf = todayIso();
  const rows = await listDepreciableAssets(requester);
  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Depreciation summary",
    [
      { header: "Asset tag", key: "assetTag", width: 16 },
      { header: "Name", key: "name", width: 30 },
      { header: "Category", key: "categoryName", width: 20 },
      { header: "Department", key: "departmentName", width: 20 },
      { header: "Status", key: "statusName", width: 12 },
      {
        header: "Purchase date",
        key: "purchaseDate",
        width: 14,
        numFmt: DATE_FORMAT,
      },
      {
        header: "Purchase cost",
        key: "purchaseCost",
        width: 16,
        numFmt: KES_FORMAT,
      },
      {
        header: "Salvage value",
        key: "salvageValue",
        width: 16,
        numFmt: KES_FORMAT,
      },
      { header: "Useful life (months)", key: "usefulLifeMonths", width: 18 },
      { header: "Months elapsed", key: "monthsElapsed", width: 15 },
      {
        header: "Accumulated depreciation",
        key: "accumulated",
        width: 24,
        numFmt: KES_FORMAT,
      },
      {
        header: "Current book value",
        key: "bookValue",
        width: 20,
        numFmt: KES_FORMAT,
      },
      { header: "Note", key: "note", width: 40 },
    ],
    rows.map((r) => {
      const result = computeStraightLine(r, asOf);
      const computed = result.kind === "computed" ? result : null;
      return {
        ...r,
        statusName: lookupCell(r.statusName),
        purchaseDate: dateCell(r.purchaseDate),
        monthsElapsed: computed?.monthsElapsed ?? "n/a",
        accumulated: computed?.accumulatedDepreciation ?? "n/a",
        bookValue: computed?.bookValue ?? "n/a",
        note: result.kind === "not_computed" ? result.reason : null,
      };
    }),
    [
      "Depreciation summary",
      `As of ${asOf} · straight-line method · book value floored at salvage value · disposed assets excluded · ${scopeLine(requester)}`,
    ],
  );
  return workbook;
}
