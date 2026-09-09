import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { updateDepartment, deleteDepartment } from "@/lib/db/departments";
import { validateDepartmentInput } from "@/lib/validation/departments";
import { ReferencedByAssetsError } from "@/lib/db/refCheck";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const validated = validateDepartmentInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const department = await updateDepartment(id, validated.data);
  if (!department) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }
  return NextResponse.json({ department });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const deleted = await deleteDepartment(id);
    if (!deleted) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
  } catch (err) {
    if (err instanceof ReferencedByAssetsError) {
      return NextResponse.json(
        { error: "Cannot delete: still referenced by one or more assets." },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
