import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/auth/api";
import { changePassword, findPasswordHash } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { validateChangePasswordInput } from "@/lib/validation/auth";

/** Self-service password change (user menu). Requires the current password, then revokes every
 * other session via users.password_changed_at and re-issues this one so it stays signed in.
 * Rate limited by nginx alongside /api/auth/login (deploy/nginx-itam.conf). */
export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const validated = validateChangePasswordInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { currentPassword, newPassword } = validated.data;
  const passwordHash = await findPasswordHash(session.userId);
  if (!passwordHash || !(await verifyPassword(currentPassword, passwordHash))) {
    return NextResponse.json(
      { error: "Current password is incorrect", field: "currentPassword" },
      { status: 400 },
    );
  }

  // Whole seconds, matching the JWT `iat` it's compared against: the token signed just below
  // gets an `iat` >= this, every earlier one is < it.
  const changedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
  await changePassword(session.userId, newPassword, changedAt);

  await setSessionCookie({
    userId: session.userId,
    roleId: session.roleId,
    roleName: session.roleName,
    departmentId: session.departmentId,
    fullName: session.fullName,
    email: session.email,
  });

  return NextResponse.json({ ok: true });
}
