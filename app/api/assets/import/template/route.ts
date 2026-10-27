import { NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { loadImportLookups } from "@/lib/db/assetImport";
import { buildImportTemplate } from "@/lib/import/assetImport";
import { workbookResponse } from "@/lib/reports/workbook";

/** The import template: instructions, an empty Assets sheet with dropdowns, and the current
 * settings on a Lookups sheet. Built per request so the dropdowns match today's settings. */
export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const workbook = buildImportTemplate(await loadImportLookups());
  return workbookResponse(workbook, "asset-import-template");
}
