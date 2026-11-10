import { NextRequest, NextResponse } from "next/server";
import { IssueFormError, acknowledgeIssueForm } from "@/lib/db/issueForms";
import { scheduleAcknowledgedNotifications } from "@/lib/issueForms/notify";
import { USER_COMMENTS_MAX_LENGTH } from "@/lib/issueForms/rules";
import { optionalString } from "@/lib/validation/helpers";

/** No session: the emailed token is the credential. This is a POST on purpose, because mail
 * scanners open every link in a message, so simply visiting the page must never sign anything. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.token !== "string" || typeof body?.typedName !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.accepted !== true) {
    return NextResponse.json(
      { error: "Tick the box to accept the terms" },
      { status: 400 },
    );
  }

  const userComments = optionalString(body.userComments);
  if (userComments === undefined) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (userComments && userComments.length > USER_COMMENTS_MAX_LENGTH) {
    return NextResponse.json(
      { error: "Comments are too long" },
      { status: 400 },
    );
  }

  // nginx sets X-Real-IP; X-Forwarded-For covers any other proxy in front.
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    null;
  const userAgent = request.headers.get("user-agent");

  try {
    const form = await acknowledgeIssueForm(
      body.token,
      body.typedName,
      userComments || null,
      {
        ip: ip?.slice(0, 64) ?? null,
        userAgent: userAgent?.slice(0, 500) ?? null,
      },
    );
    if (!form) {
      return NextResponse.json(
        { error: "This link is no longer valid", code: "invalid_token" },
        { status: 410 },
      );
    }
    scheduleAcknowledgedNotifications(form);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof IssueFormError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
