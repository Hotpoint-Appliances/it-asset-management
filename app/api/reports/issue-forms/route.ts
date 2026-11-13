import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import {
  parseIssueFormFilters,
  searchParamsToRecord,
} from "@/lib/issueForms/register";
import { buildIssueFormRegisterWorkbook } from "@/lib/reports/reports";
import { workbookResponse } from "@/lib/reports/workbook";

/** The issue-form register export. Takes the /issue-forms query string, so the download is the
 * filtered set on screen, every page of it. Staff only: forms carry payroll numbers. */
export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const filters = parseIssueFormFilters(
    searchParamsToRecord(request.nextUrl.searchParams),
  );
  const workbook = await buildIssueFormRegisterWorkbook(filters);
  return workbookResponse(workbook, "issue-forms");
}
