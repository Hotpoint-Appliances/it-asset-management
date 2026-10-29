/** The Excel import's column contract, shared by the template (lib/import/assetImport.ts), the
 * parser and the in-app instructions, so the three can't drift apart. No exceljs here: the
 * import page is a client component. */

export type ImportColumnKey =
  | "assetTag"
  | "name"
  | "category"
  | "modelNumber"
  | "serialNumber"
  | "location"
  | "department"
  | "assignedUserEmail"
  | "ownerName"
  | "ownerEmail"
  | "condition"
  | "status"
  | "vendor"
  | "purchaseDate"
  | "purchaseCost"
  | "warrantyExpiry"
  | "depreciationMethod"
  | "usefulLifeMonths"
  | "salvageValue"
  | "notes";

/** Which Lookups-sheet list a column's values come from. */
export type ImportLookupKind =
  | "categories"
  | "locations"
  | "departments"
  | "users"
  | "conditions"
  | "statuses"
  | "vendors"
  | "depreciationMethods";

export interface ImportColumn {
  key: ImportColumnKey;
  header: string;
  required: boolean;
  kind: "text" | "lookup" | "email" | "date" | "money" | "months";
  lookup?: ImportLookupKind;
  /** Matches the DB column's VARCHAR length, so an over-long value is a row error, not a 500. */
  maxLength?: number;
  width: number;
  description: string;
  example: string;
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    key: "assetTag",
    header: "Asset tag",
    required: true,
    kind: "text",
    maxLength: 50,
    width: 16,
    description:
      "Unique ID on the asset's label. Must not already exist in the system or appear twice in the file (not case-sensitive).",
    example: "HP-LT-0042",
  },
  {
    key: "name",
    header: "Name",
    required: true,
    kind: "text",
    maxLength: 200,
    width: 28,
    description: "A short description of the asset.",
    example: "Dell Latitude 5440",
  },
  {
    key: "category",
    header: "Category",
    required: true,
    kind: "lookup",
    lookup: "categories",
    width: 22,
    description:
      "A category from Settings > Categories. Use the full path (Parent > Child) when two categories share a name.",
    example: "Laptop",
  },
  {
    key: "modelNumber",
    header: "Model number",
    required: false,
    kind: "text",
    maxLength: 100,
    width: 18,
    description: "Manufacturer model number.",
    example: "Latitude 5440",
  },
  {
    key: "serialNumber",
    header: "Serial number",
    required: true,
    kind: "text",
    maxLength: 100,
    width: 20,
    description:
      "Manufacturer serial number. Must not already be on another asset or appear twice in the file (not case-sensitive).",
    example: "8XK2LM3",
  },
  {
    key: "location",
    header: "Location",
    required: true,
    kind: "lookup",
    lookup: "locations",
    width: 24,
    description:
      "A location from Settings > Locations. Use the full path (Site > Building) when two locations share a name.",
    example: "Sarit",
  },
  {
    key: "department",
    header: "Department",
    required: true,
    kind: "lookup",
    lookup: "departments",
    width: 20,
    description: "A department from Settings > Departments.",
    example: "Finance",
  },
  {
    key: "assignedUserEmail",
    header: "Assigned user email",
    required: false,
    kind: "lookup",
    lookup: "users",
    maxLength: 150,
    width: 28,
    description:
      "Email of the system user who owns the asset. Leave blank for an external owner and fill Owner name instead.",
    example: "jane.doe@hotpoint.co.ke",
  },
  {
    key: "ownerName",
    header: "Owner name",
    required: false,
    kind: "text",
    maxLength: 150,
    width: 22,
    description:
      "External owner without a system login. Required when Assigned user email is blank; leave blank when it's filled.",
    example: "",
  },
  {
    key: "ownerEmail",
    header: "Owner email",
    required: false,
    kind: "email",
    maxLength: 150,
    width: 26,
    description: "Optional email for the external owner.",
    example: "",
  },
  {
    key: "condition",
    header: "Condition",
    required: true,
    kind: "lookup",
    lookup: "conditions",
    width: 14,
    description: "A condition from Settings > Conditions.",
    example: "good",
  },
  {
    key: "status",
    header: "Status",
    required: true,
    kind: "lookup",
    lookup: "statuses",
    width: 14,
    description:
      "A status from Settings > Statuses. Disposed isn't allowed: dispose an asset from its page after importing.",
    example: "active",
  },
  {
    key: "vendor",
    header: "Vendor",
    required: false,
    kind: "lookup",
    lookup: "vendors",
    width: 22,
    description: "A vendor from Settings > Vendors.",
    example: "",
  },
  {
    key: "purchaseDate",
    header: "Purchase date",
    required: false,
    kind: "date",
    width: 15,
    description:
      "An Excel date, or text as YYYY-MM-DD. Can't be in the future.",
    example: "2025-03-14",
  },
  {
    key: "purchaseCost",
    header: "Purchase cost (KES)",
    required: false,
    kind: "money",
    width: 18,
    description: "Amount in KES, 0 or more.",
    example: "145000",
  },
  {
    key: "warrantyExpiry",
    header: "Warranty expiry",
    required: false,
    kind: "date",
    width: 15,
    description:
      "An Excel date, or text as YYYY-MM-DD. Can't be before the purchase date.",
    example: "2028-03-14",
  },
  {
    key: "depreciationMethod",
    header: "Depreciation method",
    required: false,
    kind: "lookup",
    lookup: "depreciationMethods",
    width: 20,
    description:
      "Straight line, or blank for none. Straight line needs a purchase date, purchase cost and useful life.",
    example: "Straight line",
  },
  {
    key: "usefulLifeMonths",
    header: "Useful life (months)",
    required: false,
    kind: "months",
    width: 18,
    description: "Whole number of months, greater than 0.",
    example: "36",
  },
  {
    key: "salvageValue",
    header: "Salvage value (KES)",
    required: false,
    kind: "money",
    width: 18,
    description: "Amount in KES, 0 or more, no more than the purchase cost.",
    example: "10000",
  },
  {
    key: "notes",
    header: "Notes",
    required: false,
    kind: "text",
    width: 36,
    description: "Anything else worth recording.",
    example: "",
  },
];

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const IMPORT_SHEET_NAME = "Assets";
