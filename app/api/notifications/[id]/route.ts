import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api";
import { setNotificationRead } from "@/lib/db/notifications";

/** `{ isRead: boolean }`, mark one of the session user's notifications read or unread. Someone
 * else's notification id is a 404, same as a missing one. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const notificationId = Number(id);
  const body = await request.json().catch(() => null);
  if (!Number.isInteger(notificationId) || typeof body?.isRead !== "boolean") {
    return NextResponse.json(
      { error: "Expected { isRead: boolean }" },
      { status: 400 },
    );
  }

  const updated = await setNotificationRead(
    notificationId,
    session.userId,
    body.isRead,
  );
  if (!updated) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
