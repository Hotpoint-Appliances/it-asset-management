import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { listAssetAttachments, createAssetAttachment } from "@/lib/db/assetAttachments";
import { assertValidAttachment, saveAssetAttachment, UploadValidationError } from "@/lib/files/upload";

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

  const attachments = await listAssetAttachments(id);
  return NextResponse.json({ attachments });
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
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const fileField = formData?.get("file");
  const file = fileField instanceof File && fileField.size > 0 ? fileField : null;
  if (!file) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  try {
    assertValidAttachment(file);
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const { relativePath } = await saveAssetAttachment(id, file);
  const attachment = await createAssetAttachment({
    assetId: id,
    filePath: relativePath,
    fileName: file.name,
    fileType: file.type || null,
    uploadedBy: session.userId,
  });

  return NextResponse.json({ attachment }, { status: 201 });
}
