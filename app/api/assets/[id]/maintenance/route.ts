import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import {
  listMaintenanceForAsset,
  createMaintenance,
} from "@/lib/db/maintenance";
import { validateMaintenanceInput } from "@/lib/validation/assetLifecycle";
import { isForeignKeyViolation } from "@/lib/db/query";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const maintenance = await listMaintenanceForAsset(id);
  return NextResponse.json({ maintenance });
}

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

  const body = await request.json().catch(() => null);
  const validated = validateMaintenanceInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  let maintenance;
  try {
    maintenance = await createMaintenance(id, validated.data, session.userId);
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        { error: "That vendor does not exist" },
        { status: 400 },
      );
    }
    throw err;
  }
  return NextResponse.json({ maintenance }, { status: 201 });
}
