import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import {
  updateAccessory,
  deleteAccessory,
  AccessoryInUseError,
} from "@/lib/db/accessories";
import { validateAccessoryInput } from "@/lib/validation/accessories";
import { isUniqueViolation } from "@/lib/db/query";

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
  const validated = validateAccessoryInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const accessory = await updateAccessory(id, validated.data);
    if (!accessory) {
      return NextResponse.json(
        { error: "Accessory not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ accessory });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "An accessory with this name already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
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
    const deleted = await deleteAccessory(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Accessory not found" },
        { status: 404 },
      );
    }
  } catch (err) {
    if (err instanceof AccessoryInUseError) {
      return NextResponse.json(
        {
          error:
            "Cannot delete: attached to one or more assets. Retire it instead.",
        },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}
