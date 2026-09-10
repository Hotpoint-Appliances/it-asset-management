import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import {
  getAssetById,
  updateAsset,
  setAssetImagePath,
  softDeleteAsset,
} from "@/lib/db/assets";
import {
  validateAssetInput,
  assetInputFromFormData,
} from "@/lib/validation/assets";
import { isUniqueViolation, isForeignKeyViolation } from "@/lib/db/query";
import {
  assertValidImage,
  saveAssetImage,
  deleteUploadedFile,
  UploadValidationError,
} from "@/lib/files/upload";

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
  return NextResponse.json({ asset });
}

export async function PATCH(
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
      { error: "A disposed asset cannot be edited" },
      { status: 400 },
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const imageField = formData.get("image");
  const imageFile =
    imageField instanceof File && imageField.size > 0 ? imageField : null;
  if (imageFile) {
    try {
      assertValidImage(imageFile);
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const validated = validateAssetInput(assetInputFromFormData(formData));
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  let asset;
  try {
    asset = await updateAsset(id, validated.data, session.userId);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Asset tag is already in use" },
        { status: 409 },
      );
    }
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        {
          error:
            "One of the referenced category/location/department/condition/status/vendor/user records does not exist",
        },
        { status: 400 },
      );
    }
    throw err;
  }
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (imageFile) {
    const previousImagePath = existing.imagePath;
    const { relativePath } = await saveAssetImage(id, imageFile);
    asset = (await setAssetImagePath(id, relativePath)) ?? asset;
    if (previousImagePath) await deleteUploadedFile(previousImagePath);
  }

  return NextResponse.json({ asset });
}

/** Soft delete (phase-5-asset-lifecycle Step 7) — data-entry correction only, never disposal
 * (per itam-schema-reference point 6); admin-only, unlike every other mutation above which
 * accepts admin or asset_manager. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  const existing = await getAssetById(id, session);
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const deleted = await softDeleteAsset(id, session.userId);
  if (!deleted) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
