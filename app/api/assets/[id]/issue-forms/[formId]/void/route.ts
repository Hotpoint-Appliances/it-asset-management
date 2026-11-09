import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { IssueFormError, voidIssueForm } from "@/lib/db/issueForms";
import { validateReason } from "@/lib/validation/issueForms";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const { id, formId } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const reason = validateReason(body?.reason, "Reason", 500);
  if (!reason.success) {
    return NextResponse.json({ error: reason.error }, { status: 400 });
  }

  try {
    const form = await voidIssueForm(id, formId, reason.data, session.userId);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    return NextResponse.json({ form });
  } catch (err) {
    if (err instanceof IssueFormError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
