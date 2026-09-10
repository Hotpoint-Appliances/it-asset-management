import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById, changeAssetCondition } from "@/lib/db/assets";
import { isForeignKeyViolation } from "@/lib/db/query";
import { requireNumber } from "@/lib/validation/helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const existing = await getAssetById(id, session);
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  if (existing.statusName === "disposed") {
    return NextResponse.json(
      { error: "A disposed asset's condition cannot be changed" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const conditionId = requireNumber(
    (body as Record<string, unknown> | null)?.conditionId,
  );
  if (conditionId === undefined) {
    return NextResponse.json(
      { error: "conditionId is required" },
      { status: 400 },
    );
  }

  let asset;
  try {
    asset = await changeAssetCondition(id, conditionId, session.userId);
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        { error: "That condition does not exist" },
        { status: 400 },
      );
    }
    throw err;
  }
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json({ asset });
}
