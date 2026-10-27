import ExcelJS from "exceljs";
import { formatLookupName } from "@/lib/badgeVariants";
import { todayIso } from "@/lib/format";
import {
  createWorkbook,
  DATE_FORMAT,
  KES_FORMAT,
} from "@/lib/reports/workbook";
import {
  findExistingAssetTags,
  findExistingSerialNumbers,
  type ImportLookupRow,
  type ImportLookups,
} from "@/lib/db/assetImport";
import {
  IMPORT_COLUMNS,
  IMPORT_SHEET_NAME,
  MAX_IMPORT_ROWS,
  type ImportColumn,
  type ImportColumnKey,
  type ImportLookupKind,
} from "./columns";
import type { AssetInput } from "@/types/asset";
import type {
  ImportCheckResult,
  ImportIssue,
  ImportPreviewRow,
} from "@/types/assetImport";

const DEPRECIATION_LABEL = "Straight line";
const HEADER_FILL = "FF1F2937";
const REQUIRED_FILL = "FF7C2D12";

// ---------------------------------------------------------------------------------------------
// Lookups: display labels (what the template lists) and name -> id resolution
// ---------------------------------------------------------------------------------------------

/** Case/whitespace/underscore-insensitive key, so "In Storage", "in_storage" and " in  storage"
 * all match, and "Site>Building" matches "Site > Building". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .split(">")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .join(" > ");
}

/** "Parent > Child" for tree tables, the plain (display) name otherwise. */
function labelsFor(rows: ImportLookupRow[]): Map<number, string> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const labels = new Map<number, string>();
  for (const row of rows) {
    const parts: string[] = [];
    const seen = new Set<number>();
    for (
      let node: ImportLookupRow | undefined = row;
      node && !seen.has(node.id);
      node = node.parentId == null ? undefined : byId.get(node.parentId)
    ) {
      seen.add(node.id);
      parts.unshift(formatLookupName(node.name));
    }
    labels.set(row.id, parts.join(" > "));
  }
  return labels;
}

type Resolved =
  { ok: true; id: number; label: string } | { ok: false; error: string };

/** Resolves a cell against one lookup table: a full path (or plain name) first, then a bare
 * leaf name if exactly one row has it. Two rows sharing the leaf name ask for the full path. */
function lookupResolver(rows: ImportLookupRow[], what: string) {
  const labels = labelsFor(rows);
  const byPath = new Map<string, number>();
  const byLeaf = new Map<string, number[]>();
  for (const row of rows) {
    byPath.set(normalize(labels.get(row.id)!), row.id);
    const leaf = normalize(row.name);
    byLeaf.set(leaf, [...(byLeaf.get(leaf) ?? []), row.id]);
  }
  return (value: string): Resolved => {
    const key = normalize(value);
    const id =
      byPath.get(key) ??
      (byLeaf.get(key)?.length === 1 ? byLeaf.get(key)![0] : undefined);
    if (id !== undefined) return { ok: true, id, label: labels.get(id)! };
    const matches = byLeaf.get(key);
    if (matches && matches.length > 1) {
      return {
        ok: false,
        error: `"${value}" matches more than one ${what}; use the full path: ${matches
          .map((m) => labels.get(m))
          .join(", ")}`,
      };
    }
    return {
      ok: false,
      error: `No ${what} named "${value}" (see the Lookups sheet)`,
    };
  };
}

/** The values offered in each template dropdown, in display form. */
function lookupLists(
  lookups: ImportLookups,
): Record<ImportLookupKind, string[]> {
  const sorted = (rows: ImportLookupRow[]) =>
    [...labelsFor(rows).values()].sort((a, b) => a.localeCompare(b));
  const ordered = (rows: ImportLookupRow[]) =>
    rows.map((r) => formatLookupName(r.name));
  return {
    categories: sorted(lookups.categories),
    locations: sorted(lookups.locations),
    departments: sorted(lookups.departments),
    users: lookups.users.map((u) => u.email),
    conditions: ordered(lookups.conditions),
    statuses: ordered(lookups.statuses.filter((s) => s.name !== "disposed")),
    vendors: sorted(lookups.vendors),
    depreciationMethods: [DEPRECIATION_LABEL],
  };
}

const LOOKUP_TITLES: Record<ImportLookupKind, string> = {
  categories: "Categories",
  locations: "Locations",
  departments: "Departments",
  users: "Users (email)",
  conditions: "Conditions",
  statuses: "Statuses",
  vendors: "Vendors",
  depreciationMethods: "Depreciation methods",
};

// ---------------------------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------------------------

function headerText(col: ImportColumn): string {
  return col.required ? `${col.header} *` : col.header;
}

function columnLetter(index: number): string {
  let n = index;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** exceljs supports range-wide validations (worksheet.dataValidations, one entry per range rather
 * than per cell) but leaves it out of its type definitions. */
function addValidation(
  sheet: ExcelJS.Worksheet,
  range: string,
  validation: ExcelJS.DataValidation,
) {
  (
    sheet as ExcelJS.Worksheet & {
      dataValidations: {
        add(address: string, validation: ExcelJS.DataValidation): void;
      };
    }
  ).dataValidations.add(range, validation);
}

function addInstructionsSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet("Instructions");
  sheet.getColumn(1).width = 24;
  sheet.getColumn(2).width = 11;
  sheet.getColumn(3).width = 80;
  sheet.getColumn(4).width = 26;

  const lines: [string, Partial<ExcelJS.Font>?][] = [
    ["Asset import template", { bold: true, size: 14 }],
    [
      `Generated ${todayIso()} · up to ${MAX_IMPORT_ROWS} assets per file`,
      { color: { argb: "FF6B7280" } },
    ],
    [""],
    ["How to import", { bold: true, size: 12 }],
    [
      "1. Fill one asset per row on the Assets sheet, starting at row 2. Don't rename the sheet or the column headers.",
    ],
    [
      "2. Columns marked * are required. Pick values for Category, Location, Department, Condition, Status and Vendor from the dropdowns; the full lists are on the Lookups sheet.",
    ],
    [
      "3. Give each asset an owner: either Assigned user email (a system user) or Owner name (an external owner), not both.",
    ],
    [
      "4. Save as .xlsx, then on the Assets > Import page choose the file and select Check file.",
    ],
    [
      "5. Fix every problem listed (by row and column) and check again. Nothing is imported until the whole file is clean.",
    ],
    [
      "6. Select Import. All rows are created together, each with a 'created' entry in its history.",
    ],
    [""],
    ["Good to know", { bold: true, size: 12 }],
    ["• Matching is not case-sensitive, and blank rows are skipped."],
    [
      "• Dropdown lists reflect the settings when this template was downloaded. If settings change, download a fresh template.",
    ],
    [
      "• Asset images, attachments and accessories aren't imported; add them on the asset's page afterwards.",
    ],
    [
      "• To dispose an imported asset, use Dispose on its page: Disposed can't be set by import.",
    ],
    [""],
    ["Columns", { bold: true, size: 12 }],
  ];
  for (const [text, font] of lines) {
    const row = sheet.addRow([text]);
    if (font) row.font = font;
  }

  const header = sheet.addRow([
    "Column",
    "Required",
    "What to enter",
    "Example",
  ]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
  });
  for (const col of IMPORT_COLUMNS) {
    const row = sheet.addRow([
      col.header,
      col.required ? "Yes" : "",
      col.description,
      col.example,
    ]);
    row.alignment = { vertical: "top", wrapText: true };
  }
  return sheet;
}

function addAssetsSheet(
  workbook: ExcelJS.Workbook,
  listRanges: Partial<Record<ImportLookupKind, string>>,
) {
  const sheet = workbook.addWorksheet(IMPORT_SHEET_NAME);
  const lastRow = MAX_IMPORT_ROWS + 1;
  IMPORT_COLUMNS.forEach((col, i) => {
    const column = sheet.getColumn(i + 1);
    column.width = col.width;
    const letter = columnLetter(i + 1);
    const range = `${letter}2:${letter}${lastRow}`;

    const cell = sheet.getCell(1, i + 1);
    cell.value = headerText(col);
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col.required ? REQUIRED_FILL : HEADER_FILL },
    };
    cell.note = col.description;

    if (col.kind === "date") {
      for (let r = 2; r <= lastRow; r++)
        sheet.getCell(r, i + 1).numFmt = DATE_FORMAT;
      addValidation(sheet, range, {
        type: "date",
        operator: "greaterThan",
        allowBlank: true,
        formulae: [new Date(Date.UTC(1900, 0, 1))],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: col.header,
        error: "Enter a date, e.g. 2025-03-14.",
      });
    } else if (col.kind === "money") {
      for (let r = 2; r <= lastRow; r++)
        sheet.getCell(r, i + 1).numFmt = KES_FORMAT;
    }

    const list = col.lookup && listRanges[col.lookup];
    if (list) {
      // "warning", not "stop": settings may have changed since the template was downloaded, and
      // the server checks every value anyway.
      addValidation(sheet, range, {
        type: "list",
        allowBlank: true,
        formulae: [list],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: col.header,
        error: "That value isn't in the list on the Lookups sheet.",
      });
    }
  });
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

/** Each list's absolute range on the Lookups sheet (one column per list, in key order). None for
 * an empty list: Excel rejects an empty dropdown source. */
function lookupRanges(
  lists: Record<ImportLookupKind, string[]>,
): Partial<Record<ImportLookupKind, string>> {
  const ranges: Partial<Record<ImportLookupKind, string>> = {};
  (Object.keys(lists) as ImportLookupKind[]).forEach((kind, i) => {
    const n = lists[kind].length;
    const letter = columnLetter(i + 1);
    if (n) ranges[kind] = `Lookups!$${letter}$2:$${letter}$${n + 1}`;
  });
  return ranges;
}

/** Lookups sheet: the full lists behind the Assets sheet's dropdowns. */
function addLookupsSheet(
  workbook: ExcelJS.Workbook,
  lists: Record<ImportLookupKind, string[]>,
) {
  const sheet = workbook.addWorksheet("Lookups");
  (Object.keys(lists) as ImportLookupKind[]).forEach((kind, i) => {
    sheet.getColumn(i + 1).width = 28;
    const header = sheet.getCell(1, i + 1);
    header.value = LOOKUP_TITLES[kind];
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    lists[kind].forEach((v, r) => (sheet.getCell(r + 2, i + 1).value = v));
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export function buildImportTemplate(lookups: ImportLookups): ExcelJS.Workbook {
  const workbook = createWorkbook();
  const lists = lookupLists(lookups);
  addInstructionsSheet(workbook);
  addAssetsSheet(workbook, lookupRanges(lists));
  addLookupsSheet(workbook, lists);
  return workbook;
}

// ---------------------------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------------------------

type CellScalar = string | number | boolean | Date | null;

class CellError extends Error {}

/** exceljs cell value -> a plain scalar: rich text joined, formulas replaced by their cached
 * result, hyperlinks by their text. Excel error values (#N/A, #REF!) throw. */
function scalar(value: ExcelJS.CellValue): CellScalar {
  if (value === null || value === undefined) return null;
  if (typeof value === "string")
    return value.trim() === "" ? null : value.trim();
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("richText" in value)
      return scalar(value.richText.map((t) => t.text).join(""));
    if ("error" in value)
      throw new CellError(`Cell contains an Excel error (${value.error})`);
    if ("formula" in value || "sharedFormula" in value)
      return scalar(
        (value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue,
      );
    if ("text" in value)
      return scalar((value as ExcelJS.CellHyperlinkValue).text);
  }
  return String(value);
}

function asText(v: CellScalar): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function isoDate(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/** A real Excel date (exceljs gives a UTC-midnight Date), a date serial number (a date typed
 * into an unformatted cell), or "YYYY-MM-DD" text. Day-first/month-first text is rejected as
 * ambiguous rather than guessed. */
function asDate(v: CellScalar): string {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) throw new CellError("Not a valid date");
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && v > 0 && v < 2958466) {
    const ms = Math.round(v) * 86_400_000 + Date.UTC(1899, 11, 30);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(asText(v));
  const iso = m && isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  if (!iso) throw new CellError("Enter a date as YYYY-MM-DD, e.g. 2025-03-14");
  return iso;
}

function asMoney(v: CellScalar): number {
  const n =
    typeof v === "number"
      ? v
      : Number(
          asText(v)
            .replace(/^kes\s*/i, "")
            .replace(/,/g, ""),
        );
  if (!Number.isFinite(n) || asText(v) === "")
    throw new CellError("Enter an amount, e.g. 145000");
  if (n < 0) throw new CellError("Must be 0 or more");
  if (n >= 1e10) throw new CellError("Amount is too large");
  return Math.round(n * 100) / 100;
}

function asMonths(v: CellScalar): number {
  const n = typeof v === "number" ? v : Number(asText(v));
  if (!Number.isInteger(n) || n <= 0 || n > 1200) {
    throw new CellError("Enter a whole number of months greater than 0");
  }
  return n;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function headerKey(text: string): string {
  return text.replace(/\*/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

const COLUMN_BY_HEADER = new Map<string, ImportColumn>(
  IMPORT_COLUMNS.map((c) => [headerKey(c.header), c]),
);

/** The sheet to import: the one named "Assets", else the first whose row 1 has an Asset tag
 * header (a user who renamed the sheet, or pasted into a blank workbook). */
function findSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | null {
  const named = workbook.worksheets.find(
    (s) => s.name.trim().toLowerCase() === IMPORT_SHEET_NAME.toLowerCase(),
  );
  if (named) return named;
  return (
    workbook.worksheets.find((s) => {
      let found = false;
      s.getRow(1).eachCell((cell) => {
        const v = cell.value;
        if (typeof v === "string" && headerKey(v) === "asset tag") found = true;
      });
      return found;
    }) ?? null
  );
}

interface ParsedRow {
  row: number;
  values: Partial<Record<ImportColumnKey, CellScalar>>;
}

export interface ImportParseOutcome extends ImportCheckResult {
  /** Ready-to-insert assets, only meaningful when `errors` is empty. */
  inputs: AssetInput[];
}

function fileError(message: string): ImportParseOutcome {
  return {
    totalRows: 0,
    errors: [{ row: null, column: null, message }],
    warnings: [],
    preview: [],
    inputs: [],
  };
}

/** Reads and validates an import file against current settings and existing assets. Everything
 * is checked before anything is written; the caller inserts `inputs` only when `errors` is
 * empty, so an import is all-or-nothing. */
export async function parseImportFile(
  buffer: ArrayBuffer,
  lookups: ImportLookups,
): Promise<ImportParseOutcome> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return fileError(
      "The file couldn't be read as an Excel workbook. Save it as .xlsx (Excel Workbook) and try again.",
    );
  }

  const sheet = findSheet(workbook);
  if (!sheet) {
    return fileError(
      `No "${IMPORT_SHEET_NAME}" sheet found. Use the import template and keep its sheet and column names.`,
    );
  }

  // Header row -> column index. Order doesn't matter; unknown headers are ignored with a warning.
  const warnings: ImportIssue[] = [];
  const columnIndex = new Map<ImportColumnKey, number>();
  const headerProblems: string[] = [];
  sheet.getRow(1).eachCell((cell, colNumber) => {
    let text: string;
    try {
      text = asText(scalar(cell.value) ?? "");
    } catch {
      return;
    }
    if (!text) return;
    const col = COLUMN_BY_HEADER.get(headerKey(text));
    if (!col) {
      warnings.push({
        row: null,
        column: text,
        message: `Column "${text}" isn't part of the template and will be ignored`,
      });
    } else if (columnIndex.has(col.key)) {
      headerProblems.push(`Column "${col.header}" appears more than once`);
    } else {
      columnIndex.set(col.key, colNumber);
    }
  });
  const missing = IMPORT_COLUMNS.filter(
    (c) => c.required && !columnIndex.has(c.key),
  );
  if (missing.length) {
    headerProblems.push(
      `Missing required column${missing.length === 1 ? "" : "s"}: ${missing
        .map((c) => c.header)
        .join(", ")}`,
    );
  }
  if (headerProblems.length) {
    return {
      ...fileError(headerProblems.join(". ")),
      errors: headerProblems.map((message) => ({
        row: null,
        column: null,
        message,
      })),
      warnings,
    };
  }

  const errors: ImportIssue[] = [];
  const parsed: ParsedRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const values: ParsedRow["values"] = {};
    let hasData = false;
    for (const [key, index] of columnIndex) {
      const col = IMPORT_COLUMNS.find((c) => c.key === key)!;
      try {
        const v = scalar(excelRow.getCell(index).value);
        values[key] = v;
        if (v !== null) hasData = true;
      } catch (err) {
        hasData = true;
        errors.push({
          row: rowNumber,
          column: col.header,
          message: (err as Error).message,
        });
      }
    }
    if (hasData) parsed.push({ row: rowNumber, values });
  });

  if (!parsed.length) {
    return {
      ...fileError(`The ${sheet.name} sheet has no assets to import.`),
      warnings,
    };
  }
  if (parsed.length > MAX_IMPORT_ROWS) {
    return {
      ...fileError(
        `The file has ${parsed.length} assets; the limit is ${MAX_IMPORT_ROWS} per import. Split it into smaller files.`,
      ),
      totalRows: parsed.length,
      warnings,
    };
  }

  const resolvers = {
    categories: lookupResolver(lookups.categories, "category"),
    locations: lookupResolver(lookups.locations, "location"),
    departments: lookupResolver(lookups.departments, "department"),
    conditions: lookupResolver(lookups.conditions, "condition"),
    statuses: lookupResolver(lookups.statuses, "status"),
    vendors: lookupResolver(lookups.vendors, "vendor"),
  };
  const statusNameById = new Map(lookups.statuses.map((s) => [s.id, s.name]));
  const userByEmail = new Map(
    lookups.users.map((u) => [u.email.toLowerCase(), u]),
  );
  const today = todayIso();

  const inputs: AssetInput[] = [];
  const preview: ImportPreviewRow[] = [];
  const inputRows: number[] = [];

  for (const { row, values } of parsed) {
    const rowErrors: ImportIssue[] = [];
    const fail = (key: ImportColumnKey, message: string) =>
      rowErrors.push({
        row,
        column: IMPORT_COLUMNS.find((c) => c.key === key)!.header,
        message,
      });
    // Cells that already failed to read (Excel errors) aren't re-reported.
    const unreadable = new Set(
      errors.filter((e) => e.row === row).map((e) => e.column),
    );

    function get<T>(
      key: ImportColumnKey,
      convert: (v: CellScalar) => T,
    ): T | null {
      const col = IMPORT_COLUMNS.find((c) => c.key === key)!;
      const v = values[key] ?? null;
      if (v === null) {
        if (col.required && !unreadable.has(col.header))
          fail(key, `${col.header} is required`);
        return null;
      }
      try {
        const out = convert(v);
        if (
          typeof out === "string" &&
          col.maxLength &&
          out.length > col.maxLength
        ) {
          fail(
            key,
            `Must be ${col.maxLength} characters or fewer (has ${out.length})`,
          );
          return null;
        }
        return out;
      } catch (err) {
        if (err instanceof CellError) {
          fail(key, err.message);
          return null;
        }
        throw err;
      }
    }

    function lookup(key: ImportColumnKey, resolve: (v: string) => Resolved) {
      const text = get(key, asText);
      if (text === null) return null;
      const r = resolve(text);
      if (!r.ok) {
        fail(key, r.error);
        return null;
      }
      return r;
    }

    const assetTag = get("assetTag", asText);
    const name = get("name", asText);
    const category = lookup("category", resolvers.categories);
    const location = lookup("location", resolvers.locations);
    const department = lookup("department", resolvers.departments);
    const condition = lookup("condition", resolvers.conditions);
    const status = lookup("status", resolvers.statuses);
    const vendor = lookup("vendor", resolvers.vendors);
    const modelNumber = get("modelNumber", asText);
    const serialNumber = get("serialNumber", asText);
    const notes = get("notes", asText);

    if (status && statusNameById.get(status.id) === "disposed") {
      fail(
        "status",
        "Disposed can't be imported; import the asset with another status, then dispose it from its page",
      );
    }

    // Owner: a system user by email, or a free-text external owner, never both (chk_asset_owner
    // needs at least one).
    const assignedEmail = get("assignedUserEmail", asText);
    const ownerName = get("ownerName", asText);
    const ownerEmail = get("ownerEmail", asText);
    let assignedUser = null;
    if (assignedEmail) {
      assignedUser = userByEmail.get(assignedEmail.toLowerCase()) ?? null;
      if (!assignedUser) {
        fail(
          "assignedUserEmail",
          `No active user with the email "${assignedEmail}"`,
        );
      }
      if (ownerName || ownerEmail) {
        fail(
          ownerName ? "ownerName" : "ownerEmail",
          "Fill either Assigned user email or Owner name/email, not both",
        );
      }
    } else if (!ownerName && !unreadable.has("Owner name")) {
      fail(
        ownerEmail ? "ownerName" : "assignedUserEmail",
        ownerEmail
          ? "Owner name is required when Owner email is filled"
          : "An owner is required: fill Assigned user email or Owner name",
      );
    }
    if (ownerEmail && !EMAIL_RE.test(ownerEmail)) {
      fail("ownerEmail", "Not a valid email address");
    }

    const purchaseDate = get("purchaseDate", asDate);
    const warrantyExpiry = get("warrantyExpiry", asDate);
    const purchaseCost = get("purchaseCost", asMoney);
    const salvageValue = get("salvageValue", asMoney);
    const usefulLifeMonths = get("usefulLifeMonths", asMonths);
    const method = lookup("depreciationMethod", (v) =>
      normalize(v) === normalize(DEPRECIATION_LABEL)
        ? { ok: true, id: 0, label: DEPRECIATION_LABEL }
        : { ok: false, error: `Use "${DEPRECIATION_LABEL}" or leave blank` },
    );

    if (purchaseDate && purchaseDate > today) {
      fail("purchaseDate", "Purchase date can't be in the future");
    }
    if (purchaseDate && warrantyExpiry && warrantyExpiry < purchaseDate) {
      fail(
        "warrantyExpiry",
        "Warranty expiry can't be before the purchase date",
      );
    }
    if (
      purchaseCost !== null &&
      salvageValue !== null &&
      salvageValue > purchaseCost
    ) {
      fail(
        "salvageValue",
        "Salvage value can't be more than the purchase cost",
      );
    }
    if (method) {
      const needs = [
        !purchaseDate && values.purchaseDate == null && "purchase date",
        purchaseCost === null && values.purchaseCost == null && "purchase cost",
        usefulLifeMonths === null &&
          values.usefulLifeMonths == null &&
          "useful life",
      ].filter(Boolean);
      if (needs.length) {
        fail(
          "depreciationMethod",
          `Straight line also needs: ${needs.join(", ")}`,
        );
      }
    }

    errors.push(...rowErrors);
    if (
      rowErrors.length ||
      unreadable.size ||
      !assetTag ||
      !name ||
      !category ||
      !location ||
      !department ||
      !condition ||
      !status
    ) {
      continue;
    }

    inputs.push({
      assetTag,
      name,
      categoryId: category.id,
      modelNumber,
      serialNumber,
      locationId: location.id,
      departmentId: department.id,
      assignedUserId: assignedUser?.id ?? null,
      ownerName: assignedUser ? null : ownerName,
      ownerEmail: assignedUser ? null : ownerEmail,
      conditionId: condition.id,
      statusId: status.id,
      vendorId: vendor?.id ?? null,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      depreciationMethod: method ? "straight_line" : null,
      usefulLifeMonths,
      salvageValue,
      notes,
    });
    inputRows.push(row);
    preview.push({
      row,
      assetTag,
      name,
      category: category.label,
      location: location.label,
      department: department.label,
      owner: assignedUser
        ? `${assignedUser.fullName} (${assignedUser.email})`
        : ownerName!,
      condition: condition.label,
      status: status.label,
    });
  }

  // Cross-row checks, on every row that has the value (valid or not).
  const tagRows = groupRows(parsed, "assetTag");
  for (const rows of tagRows.values()) {
    if (rows.length < 2) continue;
    for (const r of rows) {
      errors.push({
        row: r,
        column: "Asset tag",
        message: `Duplicate asset tag in this file (also on row ${rows.filter((x) => x !== r).join(", ")})`,
      });
    }
  }
  const existingTags = await findExistingAssetTags([...tagRows.keys()]);
  for (const [tag, rows] of tagRows) {
    if (!existingTags.has(tag)) continue;
    for (const r of rows) {
      errors.push({
        row: r,
        column: "Asset tag",
        message: "This asset tag already exists in the system",
      });
    }
  }

  const serialRows = groupRows(parsed, "serialNumber");
  for (const rows of serialRows.values()) {
    if (rows.length < 2) continue;
    for (const r of rows) {
      warnings.push({
        row: r,
        column: "Serial number",
        message: `Same serial number as row ${rows.filter((x) => x !== r).join(", ")}`,
      });
    }
  }
  const existingSerials = await findExistingSerialNumbers([
    ...serialRows.keys(),
  ]);
  for (const [serial, rows] of serialRows) {
    const tag = existingSerials.get(serial);
    if (!tag) continue;
    for (const r of rows) {
      warnings.push({
        row: r,
        column: "Serial number",
        message: `Serial number is already recorded on asset ${tag}`,
      });
    }
  }

  const byPosition = (a: ImportIssue, b: ImportIssue) =>
    (a.row ?? 0) - (b.row ?? 0) ||
    columnOrder(a.column) - columnOrder(b.column);
  errors.sort(byPosition);
  warnings.sort(byPosition);

  // Rows that only failed a cross-row check drop out of the preview too.
  const badRows = new Set(errors.map((e) => e.row));
  const keep = inputRows.map((r) => !badRows.has(r));
  return {
    totalRows: parsed.length,
    errors,
    warnings,
    preview: preview.filter((_, i) => keep[i]),
    inputs: inputs.filter((_, i) => keep[i]),
  };
}

/** Lower-cased value -> the rows that have it, for a text column. */
function groupRows(
  parsed: ParsedRow[],
  key: ImportColumnKey,
): Map<string, number[]> {
  const groups = new Map<string, number[]>();
  for (const { row, values } of parsed) {
    const v = values[key];
    if (v === null || v === undefined) continue;
    const k = asText(v).toLowerCase();
    groups.set(k, [...(groups.get(k) ?? []), row]);
  }
  return groups;
}

function columnOrder(header: string | null): number {
  const i = IMPORT_COLUMNS.findIndex((c) => c.header === header);
  return i === -1 ? -1 : i;
}
