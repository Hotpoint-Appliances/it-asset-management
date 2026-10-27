/** One problem found while checking an import file. `row` is the Excel row number (header is
 * row 1) and `column` the template header, both null for a problem with the file as a whole. */
export interface ImportIssue {
  row: number | null;
  column: string | null;
  message: string;
}

/** A row that passed validation, as shown in the preview table. */
export interface ImportPreviewRow {
  row: number;
  assetTag: string;
  name: string;
  category: string;
  location: string;
  department: string;
  owner: string;
  condition: string;
  status: string;
}

/** POST /api/assets/import response, for both the check and the import itself. */
export interface ImportCheckResult {
  /** Rows with data (blank rows are skipped). */
  totalRows: number;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  preview: ImportPreviewRow[];
  /** Set once the assets have been created (mode=import with no errors). */
  imported?: number;
}
