import { NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { buildDepreciationWorkbook } from "@/lib/reports/reports";
import { workbookResponse } from "@/lib/reports/workbook";

/** Depreciation summary (phase-6, straight-line only): a finance artifact, so admin +
 * asset_manager only. */
export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const workbook = await buildDepreciationWorkbook(session);
  return workbookResponse(workbook, "depreciation-summary");
}
