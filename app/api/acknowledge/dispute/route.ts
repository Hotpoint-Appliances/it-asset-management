import { NextRequest, NextResponse } from "next/server";
import { disputeIssueForm } from "@/lib/db/issueForms";
import { scheduleDisputedNotifications } from "@/lib/issueForms/notify";
import { validateReason } from "@/lib/validation/issueForms";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.token !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const reason = validateReason(body.reason, "Description", 1000);
  if (!reason.success) {
    return NextResponse.json({ error: reason.error }, { status: 400 });
  }

  const form = await disputeIssueForm(body.token, reason.data);
  if (!form) {
    return NextResponse.json(
      { error: "This link is no longer valid", code: "invalid_token" },
      { status: 410 },
    );
  }
  scheduleDisputedNotifications(form);
  return NextResponse.json({ ok: true });
}
