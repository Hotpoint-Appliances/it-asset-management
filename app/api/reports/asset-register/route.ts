import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api";
import { parseAssetRegisterParams } from "@/lib/reports/params";
import { buildAssetRegisterWorkbook } from "@/lib/reports/reports";
import { workbookResponse } from "@/lib/reports/workbook";

/** Full asset register export (phase-6). Open to every role; a viewer's rows are limited to
 * their own department by the query itself (lib/db/reports.ts), not by this handler. */
export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const filters = parseAssetRegisterParams(request.nextUrl.searchParams);
  const workbook = await buildAssetRegisterWorkbook(filters, session);
  return workbookResponse(workbook, "asset-register");
}
