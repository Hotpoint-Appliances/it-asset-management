import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, touchLastLogin } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { validateLoginInput } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const validated = validateLoginInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { email, password } = validated.data;
  const user = await findUserByEmail(email);

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await setSessionCookie({
    userId: user.id,
    roleId: user.roleId,
    roleName: user.roleName,
    departmentId: user.departmentId,
    fullName: user.fullName,
    email: user.email,
  });
  await touchLastLogin(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roleName: user.roleName,
      departmentId: user.departmentId,
    },
  });
}
