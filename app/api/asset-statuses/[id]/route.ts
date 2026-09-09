import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { updateAssetStatus, deleteAssetStatus } from "@/lib/db/assetStatuses";
import { validateAssetStatusInput } from "@/lib/validation/assetStatuses";
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
  const validated = validateAssetStatusInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const status = await updateAssetStatus(id, validated.data);
  if (!status) {
    return NextResponse.json({ error: "Status not found" }, { status: 404 });
  }
  return NextResponse.json({ status });
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
    const deleted = await deleteAssetStatus(id);
    if (!deleted) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
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
