import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import {
  listAssetAccessories,
  replaceAssetAccessories,
  AssetAccessoryError,
} from "@/lib/db/assetAccessories";
import { validateAssetAccessories } from "@/lib/validation/accessories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  // getAssetById applies viewer department scoping, so it gates the accessory list too.
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json({ accessories: await listAssetAccessories(id) });
}

/** Replaces the asset's whole accessory list (the detail tab's "Edit accessories" dialog). The
 * status lock and audit rows are handled in syncAssetAccessories, shared with the asset form. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const validated = validateAssetAccessories(body?.accessories);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const accessories = await replaceAssetAccessories(
      id,
      validated.data,
      session.userId,
    );
    if (!accessories) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json({ accessories });
  } catch (err) {
    if (err instanceof AssetAccessoryError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
