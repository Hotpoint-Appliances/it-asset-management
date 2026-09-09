import { NextResponse } from "next/server";
import { getSession, type RoleName, type SessionPayload } from "./session";

/** Route-handler counterpart to requireSession()/requireRole() — returns a 401 JSON response
 * instead of redirecting, per the Route Handlers guidance proxy.ts's matcher comment references. */
export async function getApiSession(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export function requireApiRole(
  session: SessionPayload,
  roles: RoleName[],
): NextResponse | null {
  if (!roles.includes(session.roleName)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
