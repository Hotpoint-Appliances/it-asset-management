import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { getIssueForm } from "@/lib/db/issueForms";
import {
  issueFormPdfResponseHeaders,
  renderIssueFormPdf,
} from "@/lib/issueForms/pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const { id, formId } = await params;
  const asset = await getAssetById(id, session);
  const form = asset ? await getIssueForm(id, formId) : null;
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
  const pdf = await renderIssueFormPdf(form);
  return new NextResponse(new Uint8Array(pdf), {
    headers: issueFormPdfResponseHeaders(form),
  });
}
