import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { formatLookupName } from "@/lib/badgeVariants";
import { todayIso } from "@/lib/format";

export const KES_FORMAT = '"KES" #,##0.00';
export const DATE_FORMAT = "yyyy-mm-dd";
export const DATETIME_FORMAT = "yyyy-mm-dd hh:mm";

export interface ReportColumn {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
}

/** "YYYY-MM-DD" -> a Date Excel renders as that calendar day. Built at UTC midnight because
 * exceljs serializes dates as UTC, so the cell shows the same day regardless of server timezone. */
export function dateCell(value: string | null): Date | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return m
    ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    : null;
}

/** ISO timestamp -> a Date whose UTC fields are the server's *local* wall-clock time. Excel has
 * no timezone concept, so without this a Nairobi-side 09:00 event would show as 06:00. */
export function dateTimeCell(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
}

/** Display form for a lookup name (`in_repair` -> `in repair`), same as the UI badges. */
export const lookupCell = (value: string | null) =>
  value ? formatLookupName(value) : null;

export function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hotpoint ITAM";
  workbook.created = new Date();
  return workbook;
}

/** Adds a worksheet with a styled, frozen, filterable header row. `titleLines` (e.g. "Generated
 * 2026-09-19 · Department: X") sit above the table so a reader knows what they're looking at. */
export function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  titleLines: string[] = [],
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name);
  titleLines.forEach((line, i) => {
    const cell = sheet.getCell(i + 1, 1);
    cell.value = line;
    cell.font =
      i === 0 ? { bold: true, size: 13 } : { color: { argb: "FF6B7280" } };
  });
  const headerRowNumber = titleLines.length ? titleLines.length + 2 : 1;

  columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.width;
    if (col.numFmt) sheet.getColumn(i + 1).numFmt = col.numFmt;
  });
  const header = sheet.getRow(headerRowNumber);
  columns.forEach((col, i) => (header.getCell(i + 1).value = col.header));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  header.alignment = { vertical: "middle" };

  rows.forEach((row, r) => {
    const excelRow = sheet.getRow(headerRowNumber + 1 + r);
    columns.forEach((col, c) => {
      const cell = excelRow.getCell(c + 1);
      cell.value = (row[col.key] ?? null) as ExcelJS.CellValue;
      // Header rows sit above the column-level numFmt, which only styles cells created after it.
      if (col.numFmt) cell.numFmt = col.numFmt;
    });
  });

  sheet.views = [{ state: "frozen", ySplit: headerRowNumber }];
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: columns.length },
  };
  return sheet;
}

/** Serializes the workbook and returns it as a file download. Built server-side (DB access
 * stays server-only per itam-conventions); the buffer is small enough that a fully in-memory
 * write is simpler and safer than piping a stream. */
export async function workbookResponse(
  workbook: ExcelJS.Workbook,
  fileBaseName: string,
): Promise<NextResponse> {
  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = todayIso();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileBaseName}-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

export { todayIso };
