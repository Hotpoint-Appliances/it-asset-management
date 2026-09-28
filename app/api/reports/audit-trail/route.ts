import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { parseAuditTrailParams } from "@/lib/reports/params";
import { buildAuditTrailWorkbook } from "@/lib/reports/reports";
import { workbookResponse } from "@/lib/reports/workbook";

/** Audit trail export for a date range and/or a single asset (phase-6). Open to every role, with
 * viewer department scoping enforced in the query; a specific `assetId` outside a viewer's
 * department 404s here rather than exporting an empty file that hints it exists. */
export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const parsed = parseAuditTrailParams(request.nextUrl.searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.data.assetId) {
    const asset = await getAssetById(parsed.data.assetId, session);
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
  }

  const workbook = await buildAuditTrailWorkbook(parsed.data, session);
  return workbookResponse(workbook, "audit-trail");
}
