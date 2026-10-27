"use client";

import * as React from "react";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { Pagination } from "@/components/shared/Pagination";
import { usePagination } from "@/lib/hooks/usePagination";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import { useUIStore } from "@/store";
import {
  IMPORT_COLUMNS,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
} from "@/lib/import/columns";
import type { ImportCheckResult, ImportIssue } from "@/types/assetImport";

const PAGE_SIZE = 25;

function errorResult(message: string): ImportCheckResult {
  return {
    totalRows: 0,
    errors: [{ row: null, column: null, message }],
    warnings: [],
    preview: [],
  };
}

/** The import endpoint answers problems as an ImportCheckResult (400/409); anything else is a
 * network or server failure. */
function resultFromError(err: unknown): ImportCheckResult {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Partial<ImportCheckResult> | undefined;
    if (data && Array.isArray(data.errors)) return data as ImportCheckResult;
    if (err.response?.status === 413) {
      return errorResult("The file is too large to upload.");
    }
  }
  return errorResult("Something went wrong. Please try again.");
}

/** Excel import (Assets > Import): download the template, check a filled-in file, review the
 * problems or the preview, then import. The server re-validates on import and creates all rows
 * in one transaction, so what's previewed is exactly what's created, or nothing is. */
export function AssetImport() {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  // The bytes that were checked. Import sends these, not the file on disk, so editing the
  // file after checking can't import something different from the preview.
  const [checked, setChecked] = React.useState<{
    blob: Blob;
    name: string;
  } | null>(null);
  const [result, setResult] = React.useState<ImportCheckResult | null>(null);
  const [busy, setBusy] = React.useState<"check" | "import" | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);
  const fileFieldId = React.useId();

  function reset() {
    setResult(null);
    setChecked(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    reset();
  }

  async function post(mode: "check" | "import", blob: Blob, name: string) {
    const formData = new FormData();
    formData.set("file", blob, name);
    const res = await axios.post<ImportCheckResult>(
      `/api/assets/import?mode=${mode}`,
      formData,
    );
    return res.data;
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setResult(errorResult("Choose an .xlsx file to check."));
      return;
    }
    setBusy("check");
    reset();
    let blob: Blob;
    try {
      // Read now: a file edited and re-saved since it was chosen can no longer be read.
      blob = new Blob([await file.arrayBuffer()], { type: file.type });
    } catch {
      setBusy(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setResult(
        errorResult(
          "The file changed after you chose it. Choose it again, then check it.",
        ),
      );
      return;
    }
    let next: ImportCheckResult;
    try {
      next = await post("check", blob, file.name);
      if (!next.errors.length) setChecked({ blob, name: file.name });
    } catch (err) {
      next = resultFromError(err);
    }
    setResult(next);
    setBusy(null);
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  async function handleImport() {
    if (!checked) return;
    setBusy("import");
    try {
      const done = await post("import", checked.blob, checked.name);
      const n = done.imported ?? 0;
      router.push("/assets?sort=updated&dir=desc", undefined, () =>
        addToast({
          title: `Imported ${n} asset${n === 1 ? "" : "s"}`,
          variant: "success",
        }),
      );
    } catch (err) {
      setResult(resultFromError(err));
      setChecked(null);
      setBusy(null);
      requestAnimationFrame(() => resultRef.current?.focus());
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Get the template</CardTitle>
          <CardDescription>
            Fill one asset per row on its Assets sheet. Its Instructions sheet
            explains every column, and the dropdowns list your current
            categories, locations, departments and other settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DownloadButton
            href="/api/assets/import/template"
            variant="outline"
            className="self-start"
          >
            Download template
          </DownloadButton>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            <li>
              Columns marked * are required. Each asset needs an owner: an{" "}
              <span className="text-foreground">Assigned user email</span> (a
              system user) or an{" "}
              <span className="text-foreground">Owner name</span>, not both.
            </li>
            <li>
              Asset tags must be new: not already in the system and not repeated
              in the file.
            </li>
            <li>
              Dates as Excel dates or YYYY-MM-DD text. Up to {MAX_IMPORT_ROWS}{" "}
              assets and {MAX_IMPORT_BYTES / 1024 / 1024} MB per file.
            </li>
            <li>
              Images, attachments and accessories aren&apos;t imported; add them
              on each asset&apos;s page. Imported assets don&apos;t send
              assignment notifications.
            </li>
          </ul>
          <ColumnReference />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Check and import</CardTitle>
          <CardDescription>
            Nothing is saved until the whole file passes. Fix any problems in
            Excel, save, and check again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            onSubmit={handleCheck}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={fileFieldId} className="text-sm font-medium">
                Excel file (.xlsx)
              </label>
              <Input
                ref={inputRef}
                id={fileFieldId}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                disabled={busy !== null}
                className="sm:max-w-xs"
              />
            </div>
            <Button
              type="submit"
              variant={checked ? "outline" : "default"}
              disabled={busy !== null || !file}
              className="self-start sm:self-auto"
            >
              {busy === "check" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {busy === "check"
                ? "Checking…"
                : result
                  ? "Check again"
                  : "Check file"}
            </Button>
          </form>

          {result && (
            <div
              ref={resultRef}
              tabIndex={-1}
              className="flex flex-col gap-4 outline-none"
            >
              <ResultSummary result={result} fileName={file?.name} />
              {result.errors.length > 0 && (
                <IssueTable issues={result.errors} label="Problems" />
              )}
              {result.warnings.length > 0 && (
                <IssueTable
                  issues={result.warnings}
                  label="Warnings (won't block the import)"
                />
              )}
              {checked && result.preview.length > 0 && (
                <>
                  <PreviewTable result={result} />
                  <Button
                    onClick={handleImport}
                    disabled={busy !== null}
                    className="self-start"
                  >
                    {busy === "import" ? (
                      <Loader2 aria-hidden="true" className="animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {busy === "import"
                      ? "Importing…"
                      : `Import ${result.preview.length} asset${result.preview.length === 1 ? "" : "s"}`}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultSummary({
  result,
  fileName,
}: {
  result: ImportCheckResult;
  fileName?: string;
}) {
  const fileLevel = result.errors.find((e) => e.row === null);
  if (result.errors.length) {
    const rows = new Set(
      result.errors.filter((e) => e.row !== null).map((e) => e.row),
    ).size;
    return (
      <div
        role="alert"
        className="border-destructive/40 bg-destructive/5 flex gap-3 rounded-lg border p-3 text-sm"
      >
        <XCircle
          aria-hidden="true"
          className="text-destructive mt-0.5 h-4 w-4 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-medium">
            {fileLevel && rows === 0
              ? "This file can't be imported"
              : `${result.errors.length} problem${result.errors.length === 1 ? "" : "s"} in ${rows} of ${result.totalRows} row${result.totalRows === 1 ? "" : "s"}`}
          </p>
          <p className="text-muted-foreground">
            {fileLevel && rows === 0
              ? fileLevel.message
              : "Nothing has been imported. Fix these in the file, save it, and check again."}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="border-success/40 bg-success/5 flex gap-3 rounded-lg border p-3 text-sm"
    >
      <CheckCircle2
        aria-hidden="true"
        className="text-success mt-0.5 h-4 w-4 shrink-0"
      />
      <div className="min-w-0">
        <p className="font-medium">
          {result.preview.length} asset{result.preview.length === 1 ? "" : "s"}{" "}
          ready to import
        </p>
        <p className="text-muted-foreground break-words">
          {fileName ? `${fileName} passed every check. ` : ""}Review the preview
          below, then import.
          {result.warnings.length > 0 &&
            ` ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"} to look over first.`}
        </p>
      </div>
    </div>
  );
}

function IssueTable({
  issues,
  label,
}: {
  issues: ImportIssue[];
  label: string;
}) {
  const { pageItems, ...pagination } = usePagination(issues, PAGE_SIZE);
  const isWarning = label.startsWith("Warnings");
  return (
    <section className="flex flex-col gap-2" aria-label={label}>
      <h3 className="flex items-center gap-2 text-sm font-medium">
        {isWarning && (
          <AlertTriangle aria-hidden="true" className="text-warning h-4 w-4" />
        )}
        {label}
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Row</TableHead>
            <TableHead className="hidden w-44 sm:table-cell">Column</TableHead>
            <TableHead>{isWarning ? "Warning" : "Problem"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((issue, i) => (
            <TableRow key={`${issue.row}-${issue.column}-${i}`}>
              <TableCell className="tabular-nums">{issue.row ?? "—"}</TableCell>
              <TableCell className="hidden whitespace-nowrap sm:table-cell">
                {issue.column ?? "File"}
              </TableCell>
              <TableCell>
                {/* Phones fold the column into this cell instead of a third column */}
                <span className="block font-medium sm:hidden">
                  {issue.column ?? "File"}
                </span>
                {issue.message}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination {...pagination} noun={isWarning ? "warnings" : "problems"} />
    </section>
  );
}

function PreviewTable({ result }: { result: ImportCheckResult }) {
  const { pageItems, ...pagination } = usePagination(result.preview, PAGE_SIZE);
  return (
    <section className="flex flex-col gap-2" aria-label="Preview">
      <h3 className="text-sm font-medium">Preview</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Row</TableHead>
            <TableHead>Asset tag</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((p) => (
            <TableRow key={p.row}>
              <TableCell className="tabular-nums">{p.row}</TableCell>
              <TableCell className="font-medium whitespace-nowrap">
                {p.assetTag}
              </TableCell>
              <TableCell className="min-w-40">{p.name}</TableCell>
              <TableCell className="whitespace-nowrap">{p.category}</TableCell>
              <TableCell className="whitespace-nowrap">{p.location}</TableCell>
              <TableCell className="whitespace-nowrap">
                {p.department}
              </TableCell>
              <TableCell className="min-w-40">{p.owner}</TableCell>
              <TableCell className="whitespace-nowrap">{p.condition}</TableCell>
              <TableCell className="whitespace-nowrap">{p.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination {...pagination} noun="assets" />
    </section>
  );
}

/** The template's column contract, collapsed by default (the template's Instructions sheet has
 * the same table). */
function ColumnReference() {
  return (
    <details className="group text-sm">
      <summary className="text-primary w-fit cursor-pointer font-medium hover:underline">
        Column reference
      </summary>
      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>What to enter</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {IMPORT_COLUMNS.map((col) => (
              <TableRow key={col.key}>
                <TableCell className="font-medium whitespace-nowrap">
                  {col.header}
                </TableCell>
                <TableCell>{col.required ? "Yes" : ""}</TableCell>
                <TableCell className="min-w-64">{col.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
