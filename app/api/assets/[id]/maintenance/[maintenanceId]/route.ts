import { NextRequest, NextResponse } from "next/server";
import { getApiSession, requireApiRole } from "@/lib/auth/api";
import { getAssetById } from "@/lib/db/assets";
import { getMaintenanceById, updateMaintenance } from "@/lib/db/maintenance";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { findStatusBeforeMostRecentInRepair } from "@/lib/db/auditLog";
import { validateMaintenanceUpdateInput } from "@/lib/validation/assetLifecycle";

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

  const maintenance = await updateMaintenance(numericId, validated.data);

  // "Marking completed prompts restoring the asset's prior status" (docs/asset-lifecycle-flow.md
  // rule 5) — resolved here (via the unified audit log, no schema change) so the client can offer
  // the prompt without a second round trip. Null means "no known prior status" (e.g. the asset
  // was created directly in_repair); the client falls back to leaving status untouched.
  let suggestedRestoreStatusId: number | null = null;
  if (validated.data.status === "completed") {
    const statuses = await listAssetStatuses();
    const inRepairStatus = statuses.find((s) => s.name === "in_repair");
    if (inRepairStatus) {
      suggestedRestoreStatusId = await findStatusBeforeMostRecentInRepair(
        id,
        inRepairStatus.id,
      );
    }
  }

  return NextResponse.json({ maintenance, suggestedRestoreStatusId });
}
