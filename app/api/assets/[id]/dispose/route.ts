import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { disposeAsset, setDisposalAttachmentPath } from "@/lib/db/disposals";
import {
  validateDisposalInput,
  disposalInputFromFormData,
} from "@/lib/validation/assetLifecycle";
import { isUniqueViolation } from "@/lib/db/query";
import {
  assertValidAttachment,
  saveAssetDisposalAttachment,
  UploadValidationError,
} from "@/lib/files/upload";

/** Disposal flow (phase-5-asset-lifecycle Step 5) — a dedicated action, not a status-dropdown
 * option, so `asset_disposals` is never skipped (docs/asset-lifecycle-flow.md rule 6).
 * `approvedBy` is the session user performing this call, not a form field — see
 * lib/db/disposals.ts's disposeAsset() doc comment for why. */
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
      { error: "This asset is already disposed" },
      { status: 400 },
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const attachmentField = formData.get("attachment");
  const attachmentFile =
    attachmentField instanceof File && attachmentField.size > 0
      ? attachmentField
      : null;
  if (attachmentFile) {
    try {
      assertValidAttachment(attachmentFile);
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const validated = validateDisposalInput(disposalInputFromFormData(formData));
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const statuses = await listAssetStatuses();
  const disposedStatus = statuses.find((s) => s.name === "disposed");
  if (!disposedStatus) {
    return NextResponse.json(
      { error: "No 'disposed' status is configured" },
      { status: 500 },
    );
  }

  let result;
  try {
    result = await disposeAsset(
      id,
      validated.data,
      session.userId,
      disposedStatus.id,
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "This asset is already disposed" },
        { status: 409 },
      );
    }
    throw err;
  }
  if (!result) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (attachmentFile) {
    const { relativePath } = await saveAssetDisposalAttachment(
      id,
      attachmentFile,
    );
    await setDisposalAttachmentPath(id, relativePath);
    result.disposal.attachmentPath = relativePath;
  }

  return NextResponse.json({ asset: result.asset, disposal: result.disposal });
}
