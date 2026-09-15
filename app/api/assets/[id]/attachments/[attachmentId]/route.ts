import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import {
  getAssetAttachmentById,
  deleteAssetAttachment,
} from "@/lib/db/assetAttachments";
import { deleteUploadedFile } from "@/lib/files/upload";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const { id, attachmentId } = await params;
  const numericId = Number(attachmentId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await getAssetAttachmentById(numericId);
  if (!existing || existing.assetId !== id) {
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 },
    );
  }

  const deleted = await deleteAssetAttachment(numericId);
  if (deleted) await deleteUploadedFile(deleted.filePath);

  return NextResponse.json({ success: true });
}
