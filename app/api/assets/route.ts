import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { listAssets, createAsset, setAssetImagePath } from "@/lib/db/assets";
import {
  validateAssetInput,
  assetInputFromFormData,
} from "@/lib/validation/assets";
import { isUniqueViolation, isForeignKeyViolation } from "@/lib/db/query";
import {
  assertValidImage,
  saveAssetImage,
  UploadValidationError,
} from "@/lib/files/upload";
import type { AssetFilters } from "@/types/asset";

function parseIds(searchParams: URLSearchParams, key: string): number[] {
  return searchParams
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map(Number)
    .filter((n) => Number.isInteger(n));
}

export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = request.nextUrl;
  const filters: AssetFilters = {
    statusIds: parseIds(searchParams, "statusId"),
    categoryIds: parseIds(searchParams, "categoryId"),
    departmentIds: parseIds(searchParams, "departmentId"),
    locationIds: parseIds(searchParams, "locationId"),
    conditionIds: parseIds(searchParams, "conditionId"),
    search: searchParams.get("search") || null,
    limit: Math.min(Number(searchParams.get("limit") ?? 25) || 25, 200),
    offset: Number(searchParams.get("offset") ?? 0) || 0,
  };

  const { items, total } = await listAssets(filters, session);
  return NextResponse.json({ assets: items, total });
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

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
    asset = await createAsset(validated.data, session.userId);
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

  if (imageFile) {
    const { relativePath } = await saveAssetImage(asset.id, imageFile);
    asset = (await setAssetImagePath(asset.id, relativePath)) ?? asset;
  }

  return NextResponse.json({ asset }, { status: 201 });
}
