import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById, transferAsset } from "@/lib/db/assets";
import { validateTransferInput } from "@/lib/validation/assetLifecycle";
import { isForeignKeyViolation } from "@/lib/db/query";

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
      { error: "A disposed asset cannot be transferred" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const validated = validateTransferInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  let asset;
  try {
    asset = await transferAsset(id, validated.data, session.userId);
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        {
          error:
            "One of the referenced location/department/user records does not exist",
        },
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
