import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runScheduledChecks } from "@/lib/notifications/triggers";

/** Constant-time comparison of the bearer token against CRON_SECRET (hashing first gives both
 * sides equal length, which timingSafeEqual requires). */
function isAuthorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return false;
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(match[1]), digest(secret));
}

/** Daily warranty_expiring / maintenance_due check plus the email catch-up (phase-7). Triggered
 * by scripts/run-notifications-check.ps1 from Windows Task Scheduler; all logic lives in
 * lib/notifications/triggers.ts, the script only calls this. No user session: it is protected by
 * the shared CRON_SECRET instead, and refuses to run at all when that isn't configured. Safe to
 * call repeatedly, a re-run creates no duplicate notifications. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      "[notifications] CRON_SECRET is not set; refusing cron request",
    );
    return NextResponse.json(
      { error: "Cron endpoint is not configured" },
      { status: 503 },
    );
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const summary = await runScheduledChecks();
  const result = { ok: true, durationMs: Date.now() - startedAt, ...summary };
  console.log("[notifications] scheduled check", JSON.stringify(result));
  return NextResponse.json(result);
}
