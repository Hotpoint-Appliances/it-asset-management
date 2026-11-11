import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { getMaintenanceById, updateMaintenance } from "@/lib/db/maintenance";
import {
  applyRepairStatus,
  maintenanceEventAction,
} from "@/lib/maintenance/repairStatus";
import { scheduleAssetEventNotifications } from "@/lib/notifications/triggers";
import {
  validateMaintenanceUpdateInput,
  isValidMaintenanceTransition,
} from "@/lib/validation/assetLifecycle";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; maintenanceId: string }> },
) {
  const session = await getApiSession();
  if (session instanceof NextResponse) return session;
  const forbidden = requireApiRole(session, ["admin", "asset_manager"]);
  if (forbidden) return forbidden;

  const { id, maintenanceId } = await params;
  const numericId = Number(maintenanceId);
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const asset = await getAssetById(id, session);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  if (asset.statusName === "disposed") {
    return NextResponse.json(
      { error: "This asset is disposed and can no longer be modified" },
      { status: 400 },
    );
  }
  const existing = await getMaintenanceById(numericId);
  if (!existing || existing.assetId !== id) {
    return NextResponse.json(
      { error: "Maintenance record not found" },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const validated = validateMaintenanceUpdateInput(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (!isValidMaintenanceTransition(existing.status, validated.data.status)) {
    return NextResponse.json(
      {
        error: `Cannot move a ${existing.status.replace("_", " ")} maintenance record to ${validated.data.status.replace("_", " ")}`,
      },
      { status: 400 },
    );
  }

  const maintenance = await updateMaintenance(numericId, validated.data);
  if (!maintenance) {
    return NextResponse.json(
      { error: "Maintenance record not found" },
      { status: 404 },
    );
  }

  // Repairs drive the asset status themselves (in_repair on start, prior status restored when the
  // last open repair finishes); for anything the automation didn't do, `suggestedRestoreStatusId`
  // lets the client offer the old confirm prompt (docs/asset-lifecycle-flow.md rule 5).
  const { change, suggestedRestoreStatusId } = await applyRepairStatus(
    asset,
    existing.status,
    maintenance,
    session.userId,
  );

  // Only status steps are announced; editing cost/notes on an open record isn't owner news.
  if (existing.status !== maintenance.status) {
    scheduleAssetEventNotifications(
      {
        before: change?.before ?? asset,
        after: change?.after ?? asset,
        note: maintenance.notes,
        action: maintenanceEventAction(asset, maintenance),
      },
      session.userId,
    );
  }

  return NextResponse.json({
    maintenance,
    suggestedRestoreStatusId,
    assetStatusChanged: !!change,
  });
}
