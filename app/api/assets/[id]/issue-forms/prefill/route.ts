import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { getIssueFormPrefill } from "@/lib/db/issueForms";
import { getHodDirectory } from "@/lib/issueForms/hods";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const prefill = await getIssueFormPrefill(id, await getHodDirectory());
  if (!prefill) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json(prefill);
}
