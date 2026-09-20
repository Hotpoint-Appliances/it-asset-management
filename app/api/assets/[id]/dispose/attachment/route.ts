import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getApiSession } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { getDisposalByAssetId } from "@/lib/db/disposals";
import { resolveUploadedFilePath, mimeTypeForPath } from "@/lib/files/upload";

/** Serves the file uploaded with a disposal (see the sibling POST route). Same access rule as
 * asset attachments: getAssetById applies the requester's department scoping, so a viewer can
 * only reach the file for an asset they can already see. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const disposal = await getDisposalByAssetId(id);
  if (!disposal?.attachmentPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(
      resolveUploadedFilePath(disposal.attachmentPath),
    );
    const fileName = disposal.attachmentPath.split("/").pop() ?? "attachment";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeForPath(disposal.attachmentPath),
        "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
