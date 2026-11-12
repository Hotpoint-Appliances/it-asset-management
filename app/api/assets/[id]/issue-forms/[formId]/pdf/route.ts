import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
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
  // Read without the asset lookup, which hides deleted assets: a signed form stays evidence after
  // its asset is deleted. Only admins and asset managers get here, so no department scoping.
  const form = await getIssueForm(id, formId);
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
  const pdf = await renderIssueFormPdf(form);
  return new NextResponse(new Uint8Array(pdf), {
    headers: issueFormPdfResponseHeaders(form),
  });
}
