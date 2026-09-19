import { query, withTransaction } from "./query";
import { toIsoString, toDateOnlyString } from "./dates";
import {
  mapAsset,
  SELECT_COLUMNS as ASSET_SELECT_COLUMNS,
  type AssetRow,
} from "./assets";
import type { Asset } from "@/types/asset";
import type { AssetDisposal, DisposalInput } from "@/types/disposal";

interface DisposalRow {
  id: number;
  asset_id: string;
  // pg parses date/timestamptz columns into Date objects — see lib/db/dates.ts
  disposal_date: Date | string;
  disposal_method: AssetDisposal["disposalMethod"];
  disposal_value: string | null;
  approved_by: string;
  approved_by_name: string;
  notes: string | null;
  attachment_path: string | null;
  created_at: Date | string;
}

function mapDisposal(row: DisposalRow): AssetDisposal {
  return {
    id: row.id,
    assetId: row.asset_id,
    disposalDate: toDateOnlyString(row.disposal_date)!,
    disposalMethod: row.disposal_method,
    disposalValue:
      row.disposal_value != null ? Number(row.disposal_value) : null,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name,
    notes: row.notes,
    attachmentPath: row.attachment_path,
    createdAt: toIsoString(row.created_at)!,
  };
}

const SELECT_COLUMNS = `d.id, d.asset_id, d.disposal_date, d.disposal_method, d.disposal_value,
  d.approved_by, u.full_name AS approved_by_name, d.notes, d.attachment_path, d.created_at`;
const JOIN = `JOIN users u ON u.id = d.approved_by`;

export async function getDisposalByAssetId(
  assetId: string,
): Promise<AssetDisposal | null> {
  const result = await query<DisposalRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_disposals d ${JOIN} WHERE d.asset_id = $1`,
    [assetId],
  );
  return result.rows[0] ? mapDisposal(result.rows[0]) : null;
}

/** Disposal flow (phase-5-asset-lifecycle Step 5 / docs/asset-lifecycle-flow.md rule 6) — one
 * transaction: insert `asset_disposals`, set `assets.status_id` to the given `disposedStatusId`,
 * write a `disposed` audit row. `approvedBy` is the session user performing the action (the
 * route already gates this to admin/asset_manager), not a separate form field — the actor
 * carrying out disposal *is* the approver, so there's nothing else to collect. The caller must
 * check the asset isn't already disposed before calling this; `asset_disposals.asset_id` is
 * UNIQUE regardless, so a race still surfaces as a clean unique_violation (isUniqueViolation()),
 * never a silent double-disposal. */
export async function disposeAsset(
  assetId: string,
  input: DisposalInput,
  approvedBy: string,
  disposedStatusId: number,
): Promise<{ asset: Asset; disposal: AssetDisposal } | null> {
  return withTransaction(async (client) => {
    const assetResult = await client.query<{ status_id: number }>(
      `SELECT status_id FROM assets WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [assetId],
    );
    if (!assetResult.rows[0]) return null;

    const disposalResult = await client.query<DisposalRow>(
      `WITH inserted AS (
         INSERT INTO asset_disposals (asset_id, disposal_date, disposal_method, disposal_value, approved_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, asset_id, disposal_date, disposal_method, disposal_value, approved_by, notes, attachment_path, created_at
       )
       SELECT ${SELECT_COLUMNS} FROM inserted d ${JOIN}`,
      [
        assetId,
        input.disposalDate,
        input.disposalMethod,
        input.disposalValue,
        approvedBy,
        input.notes,
      ],
    );
    const disposal = mapDisposal(disposalResult.rows[0]);

    const assetUpdateResult = await client.query<AssetRow>(
      `UPDATE assets SET status_id = $2 WHERE id = $1 RETURNING ${ASSET_SELECT_COLUMNS}`,
      [assetId, disposedStatusId],
    );

    await client.query(
      `INSERT INTO asset_audit_log (asset_id, action_type, field_name, old_value, new_value, note, performed_by)
       VALUES ($1, 'disposed', 'status_id', $2, $3, $4, $5)`,
      [
        assetId,
        String(assetResult.rows[0].status_id),
        String(disposedStatusId),
        input.notes,
        approvedBy,
      ],
    );

    const asset: Asset = mapAsset(assetUpdateResult.rows[0]);

    return { asset, disposal };
  });
}

export async function setDisposalAttachmentPath(
  assetId: string,
  attachmentPath: string,
): Promise<void> {
  await query(
    `UPDATE asset_disposals SET attachment_path = $2 WHERE asset_id = $1`,
    [assetId, attachmentPath],
  );
}
