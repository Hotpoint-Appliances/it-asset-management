import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { IssueFormError, prepareIssueFormResend } from "@/lib/db/issueForms";
import { deliverIssueFormRequest } from "@/lib/issueForms/notify";

export async function POST(
  _request: NextRequest,
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

  try {
    const prepared = await prepareIssueFormResend(id, formId, session.userId);
    if (!prepared) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    const emailSent = await deliverIssueFormRequest(
      prepared.form,
      prepared.token,
    );
    return NextResponse.json({ form: prepared.form, emailSent });
  } catch (err) {
    if (err instanceof IssueFormError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
