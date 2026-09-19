import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { updateUser, setUserActive } from "@/lib/db/users";
import { isUniqueViolation } from "@/lib/db/query";
import { validateUpdateUserInput } from "@/lib/validation/users";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  // Deactivate/reactivate: { isActive: boolean } with no other fields.
  if (
    body &&
    typeof body === "object" &&
    "isActive" in body &&
    Object.keys(body).length === 1
  ) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 },
      );
    }
    const user = await setUserActive(id, body.isActive);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  }

  const validated = validateUpdateUserInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const user = await updateUser(id, validated.data);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A user with that email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
