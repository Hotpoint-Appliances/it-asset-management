import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api";
import { markAllNotificationsRead } from "@/lib/db/notifications";

export async function POST() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const updated = await markAllNotificationsRead(session.userId);
  return NextResponse.json({ updated });
}
