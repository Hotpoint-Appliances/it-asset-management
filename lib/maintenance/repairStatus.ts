import { changeAssetStatus, type AssetChange } from "@/lib/db/assets";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { findStatusBeforeMostRecentInRepair } from "@/lib/db/auditLog";
import { query } from "@/lib/db/query";
import type { AssetWithRelations } from "@/types/asset";
import type { AssetMaintenance, MaintenanceStatus } from "@/types/maintenance";
import { formatDate } from "@/lib/format";
import {
  assetLabel,
  type AssetEventAction,
} from "@/lib/notifications/triggers";

/** Restoring into these needs a note (status route rule) or a dedicated flow, so the repair
 * automation leaves them to the user's confirm prompt instead of picking them silently. */
const NO_AUTO_RESTORE = new Set(["lost", "stolen", "disposed"]);

export interface RepairStatusResult {
  /** The asset status change the automation made, if any (for the notification diff). */
  change: AssetChange | null;
  /** For a finished record the automation didn't restore: the prior status the client may offer
   * to restore. Null when there's nothing to offer (unknown, or other repairs still open). */
  suggestedRestoreStatusId: number | null;
}

async function otherOpenRepairs(
  assetId: string,
  maintenanceId: number,
): Promise<number> {
  const result = await query<{ n: number }>(
    `SELECT count(*)::int AS n FROM asset_maintenance
     WHERE asset_id = $1 AND id <> $2 AND maintenance_type = 'repair' AND status = 'in_progress'`,
    [assetId, maintenanceId],
  );
  return result.rows[0].n;
}

/** Asset-status side effects of a maintenance status change (docs/asset-lifecycle-flow.md rule 5,
 * automated for repairs per the change request):
 *  - A `repair` record starting sets the asset to in_repair (if not already).
 *  - A `repair` record finishing (completed, or cancelled after it started) restores the status
 *    the asset had before its in_repair transition, once no other repair on it is still open.
 *  - `service` / `inspection` change nothing; on completion the client may still offer the
 *    restore prompt (suggestedRestoreStatusId), as before. */
export async function applyRepairStatus(
  asset: AssetWithRelations,
  previous: MaintenanceStatus,
  record: AssetMaintenance,
  performedBy: string,
): Promise<RepairStatusResult> {
  const none: RepairStatusResult = {
    change: null,
    suggestedRestoreStatusId: null,
  };
  const statuses = await listAssetStatuses();
  const inRepair = statuses.find((s) => s.name === "in_repair");
  if (!inRepair) return none;
  const isRepair = record.maintenanceType === "repair";

  if (record.status === "in_progress") {
    if (!isRepair || asset.statusId === inRepair.id) return none;
    const change = await changeAssetStatus(
      asset.id,
      inRepair.id,
      performedBy,
      "Repair started.",
    );
    return { change, suggestedRestoreStatusId: null };
  }

  const finished =
    record.status === "completed" ||
    (record.status === "cancelled" && previous === "in_progress");
  if (!finished || asset.statusId !== inRepair.id) return none;
  if (!isRepair) {
    // Unchanged pre-existing behaviour: offer (never force) the restore on completion.
    return record.status === "completed"
      ? {
          change: null,
          suggestedRestoreStatusId: await findStatusBeforeMostRecentInRepair(
            asset.id,
            inRepair.id,
          ),
        }
      : none;
  }
  if ((await otherOpenRepairs(asset.id, record.id)) > 0) return none;

  const priorId = await findStatusBeforeMostRecentInRepair(
    asset.id,
    inRepair.id,
  );
  const prior = statuses.find((s) => s.id === priorId);
  if (!prior || prior.id === inRepair.id) return none;
  if (NO_AUTO_RESTORE.has(prior.name)) {
    return { change: null, suggestedRestoreStatusId: prior.id };
  }
  const change = await changeAssetStatus(
    asset.id,
    prior.id,
    performedBy,
    record.status === "completed" ? "Repair completed." : "Repair cancelled.",
  );
  return { change, suggestedRestoreStatusId: null };
}

const TYPE_NOUN: Record<AssetMaintenance["maintenanceType"], string> = {
  repair: "Repair",
  service: "Service",
  inspection: "Inspection",
};

/** How a maintenance step reads in the owner/actor notifications (lib/notifications/triggers.ts
 * appends " by <actor>." to `lead`). Cost stays out: it's internal, like the asset's own. */
export function maintenanceEventAction(
  asset: Pick<AssetWithRelations, "name" | "assetTag">,
  record: AssetMaintenance,
): AssetEventAction {
  const noun = TYPE_NOUN[record.maintenanceType];
  const lower = noun.toLowerCase();
  const a = record.maintenanceType === "inspection" ? "an" : "a";
  const label = assetLabel(asset);
  const details = [
    `Type: ${noun}`,
    ...(record.vendorName ? [`Vendor: ${record.vendorName}`] : []),
  ];
  switch (record.status) {
    case "scheduled":
      return {
        type: "asset_maintenance",
        ownerTitle: `${noun} scheduled for your asset`,
        actorTitle: `You scheduled ${a} ${lower}`,
        lead: `${a === "an" ? "An" : "A"} ${lower} was scheduled for ${label}`,
        details: [
          ...details,
          ...(record.scheduledDate
            ? [`Scheduled for: ${formatDate(record.scheduledDate)}`]
            : []),
        ],
      };
    case "in_progress":
      return {
        type: "asset_maintenance",
        ownerTitle:
          record.maintenanceType === "repair"
            ? "Your asset was sent for repair"
            : `${noun} started on your asset`,
        actorTitle: `You started ${a} ${lower}`,
        lead: `${a === "an" ? "An" : "A"} ${lower} on ${label} was started`,
        details,
      };
    case "completed":
      return {
        type: "asset_maintenance",
        ownerTitle: `${noun} completed on your asset`,
        actorTitle: `You completed ${a} ${lower}`,
        lead: `The ${lower} on ${label} was completed`,
        details: [
          ...details,
          ...(record.completedDate
            ? [`Completed on: ${formatDate(record.completedDate)}`]
            : []),
        ],
      };
    case "cancelled":
      return {
        type: "asset_maintenance",
        ownerTitle: `${noun} cancelled for your asset`,
        actorTitle: `You cancelled ${a} ${lower}`,
        lead: `The ${lower} on ${label} was cancelled`,
        details,
      };
  }
}
