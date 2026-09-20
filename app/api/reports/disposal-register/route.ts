import { NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { buildDisposalRegisterWorkbook } from "@/lib/reports/reports";
import { workbookResponse } from "@/lib/reports/workbook";

/** Disposal register (phase-6): a finance/audit artifact, so admin + asset_manager only. */
export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const workbook = await buildDisposalRegisterWorkbook(session);
  return workbookResponse(workbook, "disposal-register");
}
