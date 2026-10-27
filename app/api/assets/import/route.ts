import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { createAssets } from "@/lib/db/assets";
import { loadImportLookups } from "@/lib/db/assetImport";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db/query";
import { parseImportFile } from "@/lib/import/assetImport";
import { MAX_IMPORT_BYTES } from "@/lib/import/columns";
import type { ImportCheckResult } from "@/types/assetImport";

function fileProblem(message: string, status = 400) {
  const result: ImportCheckResult = {
    totalRows: 0,
    errors: [{ row: null, column: null, message }],
    warnings: [],
    preview: [],
  };
  return NextResponse.json(result, { status });
}

/** Excel asset import. `?mode=check` validates the uploaded file and returns every problem plus
 * a preview; `?mode=import` re-validates the same file and, only if it's clean, creates every
 * asset in one transaction (all or nothing). Stateless: the client sends the file both times,
 * so nothing is stored between the check and the import.
 *
 * Assignment notifications aren't sent for imported assets: an import onboards existing
 * records, and emailing each owner once per asset would flood inboxes. */
export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const mode = request.nextUrl.searchParams.get("mode");
  if (mode !== "check" && mode !== "import") {
    return NextResponse.json(
      { error: "mode must be check or import" },
      { status: 400 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fileProblem("Choose an .xlsx file to import.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return fileProblem(
      "Only .xlsx files can be imported. In Excel, use Save As > Excel Workbook (.xlsx).",
    );
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return fileProblem(
      `The file is larger than ${MAX_IMPORT_BYTES / 1024 / 1024} MB. Split it into smaller files.`,
    );
  }

  const { inputs, ...result } = await parseImportFile(
    await file.arrayBuffer(),
    await loadImportLookups(),
  );
  if (mode === "check" || result.errors.length) {
    return NextResponse.json(result, {
      status: mode === "import" ? 400 : 200,
    });
  }

  try {
    await createAssets(
      inputs,
      session.userId,
      `Imported from ${file.name.slice(0, 120)}`,
    );
  } catch (err) {
    // Something changed between the checks above and the insert (another user created one of
    // these tags, or a referenced setting was deleted). The transaction rolled back.
    if (isUniqueViolation(err)) {
      return fileProblem(
        "One of these asset tags was just created by someone else. Nothing was imported; check the file again.",
        409,
      );
    }
    if (isForeignKeyViolation(err)) {
      return fileProblem(
        "A category, location or other setting used in the file was just removed. Nothing was imported; check the file again.",
      );
    }
    throw err;
  }

  const imported: ImportCheckResult = { ...result, imported: inputs.length };
  return NextResponse.json(imported, { status: 201 });
}
