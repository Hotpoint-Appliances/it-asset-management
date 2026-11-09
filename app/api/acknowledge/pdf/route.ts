import { NextRequest, NextResponse } from "next/server";
import { getIssueFormByToken } from "@/lib/db/issueForms";
import {
  issueFormPdfResponseHeaders,
  renderIssueFormPdf,
} from "@/lib/issueForms/pdf";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const form = token ? await getIssueFormByToken(token) : null;
  if (!form) {
    return NextResponse.json(
      { error: "This link is no longer valid" },
      { status: 404 },
    );
  }
  const pdf = await renderIssueFormPdf(form);
  return new NextResponse(new Uint8Array(pdf), {
    headers: issueFormPdfResponseHeaders(form),
  });
}
