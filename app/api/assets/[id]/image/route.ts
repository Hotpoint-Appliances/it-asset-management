import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getApiSession } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { resolveUploadedFilePath, mimeTypeForPath } from "@/lib/files/upload";

/** Serves the asset's image from disk — never exposes ASSET_FILES_BASE_PATH itself via a
 * static public dir, per phase-4-asset-management's Step 3. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset || !asset.imagePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(resolveUploadedFilePath(asset.imagePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeForPath(asset.imagePath),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
