import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listUsers, createUser } from "@/lib/db/users";
import { isUniqueViolation } from "@/lib/db/query";
import { validateCreateUserInput } from "@/lib/validation/users";

export async function GET() {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const users = await listUsers({
    roleName: session.roleName,
    departmentId: session.departmentId,
  });
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  const validated = validateCreateUserInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const user = await createUser(validated.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "A user with that email already exists" }, { status: 409 });
    }
    throw err;
  }
}
