import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getApiSession } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { getAssetAttachmentById } from "@/lib/db/assetAttachments";
import { resolveUploadedFilePath, mimeTypeForPath } from "@/lib/files/upload";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id, attachmentId } = await params;
  const numericId = Number(attachmentId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const attachment = await getAssetAttachmentById(numericId);
  if (!attachment || attachment.assetId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(resolveUploadedFilePath(attachment.filePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          attachment.fileType || mimeTypeForPath(attachment.filePath),
        "Content-Disposition": `inline; filename="${attachment.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
