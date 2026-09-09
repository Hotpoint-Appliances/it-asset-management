import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { updateVendor, deleteVendor } from "@/lib/db/vendors";
import { validateVendorInput } from "@/lib/validation/vendors";
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
  const validated = validateVendorInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const vendor = await updateVendor(id, validated.data);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }
  return NextResponse.json({ vendor });
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
    const deleted = await deleteVendor(id);
    if (!deleted) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
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
