import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById, changeAssetStatus } from "@/lib/db/assets";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { isForeignKeyViolation } from "@/lib/db/query";
import { requireNumber, optionalString } from "@/lib/validation/helpers";

const NOTE_REQUIRED_STATUSES = new Set(["lost", "stolen"]);

/** Status change action (phase-5-asset-lifecycle Step 3). Enforces
 * docs/asset-lifecycle-flow.md's transition rules that don't live in the schema: disposal is
 * blocked here (must go through the dedicated /dispose flow, so an asset_disposals row is never
 * skipped) and lost/stolen requires a note. in_repair's "prompt to also create a maintenance
 * record" is a UI-only nudge (the dialog offers it after a successful call here), not enforced
 * server-side — the lifecycle doc says "don't force it". */
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
      { error: "A disposed asset's status cannot be changed" },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const statusId = requireNumber(body?.statusId);
  if (statusId === undefined) {
    return NextResponse.json(
      { error: "statusId is required" },
      { status: 400 },
    );
  }
  const note = optionalString(body?.note);
  if (note === undefined) {
    return NextResponse.json(
      { error: "note must be a string or null" },
      { status: 400 },
    );
  }

  const statuses = await listAssetStatuses();
  const targetStatus = statuses.find((s) => s.id === statusId);
  if (!targetStatus) {
    return NextResponse.json(
      { error: "That status does not exist" },
      { status: 400 },
    );
  }
  if (targetStatus.name === "disposed") {
    return NextResponse.json(
      { error: "Use the disposal flow to mark an asset as disposed" },
      { status: 400 },
    );
  }
  if (NOTE_REQUIRED_STATUSES.has(targetStatus.name) && !note) {
    return NextResponse.json(
      {
        error: `A note explaining the circumstances is required for ${targetStatus.name}`,
      },
      { status: 400 },
    );
  }

  let asset;
  try {
    asset = await changeAssetStatus(id, statusId, session.userId, note);
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        { error: "That status does not exist" },
        { status: 400 },
      );
    }
    throw err;
  }
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json({ asset });
}
