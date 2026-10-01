import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api";
import { listNotificationsForUser } from "@/lib/db/notifications";

const MAX_LIMIT = 50;

/** The current user's notifications, newest first, paginated (`limit`/`offset`, `unread=1` for
 * unread only). Always scoped to the session user; there is no way to read anyone else's. */
export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const sp = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 10, 1), MAX_LIMIT);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);
  const unreadOnly = sp.get("unread") === "1";

  const page = await listNotificationsForUser(session.userId, {
    limit,
    offset,
    unreadOnly,
  });
  return NextResponse.json(page);
}
