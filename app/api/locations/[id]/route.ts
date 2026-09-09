import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listLocations, updateLocation, deleteLocation } from "@/lib/db/locations";
import { validateLocationInput } from "@/lib/validation/locations";
import { collectDescendantIds } from "@/lib/tree";
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
  const validated = validateLocationInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const parentId = validated.data.parentLocationId;
  if (parentId != null) {
    if (parentId === id) {
      return NextResponse.json({ error: "A location cannot be its own parent" }, { status: 400 });
    }
    const existing = await listLocations();
    if (!existing.some((l) => l.id === parentId)) {
      return NextResponse.json({ error: "parentLocationId does not exist" }, { status: 400 });
    }
    const descendants = collectDescendantIds(
      existing.map((l) => ({ id: l.id, parentId: l.parentLocationId, name: l.name })),
      id,
    );
    if (descendants.has(parentId)) {
      return NextResponse.json(
        { error: "Cannot move a location under one of its own descendants" },
        { status: 400 },
      );
    }
  }

  const location = await updateLocation(id, validated.data);
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  return NextResponse.json({ location });
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
    const deleted = await deleteLocation(id);
    if (!deleted) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
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
