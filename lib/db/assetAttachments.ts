import { query } from "./query";
import { toIsoString } from "./dates";
import type { AssetAttachment } from "@/types/assetAttachment";

interface AssetAttachmentRow {
  id: number;
  asset_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_at: Date | string; // pg parses timestamptz into a Date — see lib/db/dates.ts
}

function mapAttachment(row: AssetAttachmentRow): AssetAttachment {
  return {
    id: row.id,
    assetId: row.asset_id,
    filePath: row.file_path,
    fileName: row.file_name,
    fileType: row.file_type,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    uploadedAt: toIsoString(row.uploaded_at)!,
  };
}

const SELECT_COLUMNS = `a.id, a.asset_id, a.file_path, a.file_name, a.file_type, a.uploaded_by,
  u.full_name AS uploaded_by_name, a.uploaded_at`;
const USER_JOIN = `JOIN users u ON u.id = a.uploaded_by`;

export async function listAssetAttachments(assetId: string): Promise<AssetAttachment[]> {
  const result = await query<AssetAttachmentRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_attachments a ${USER_JOIN}
     WHERE a.asset_id = $1 ORDER BY a.uploaded_at DESC`,
    [assetId],
  );
  return result.rows.map(mapAttachment);
}

export async function getAssetAttachmentById(id: number): Promise<AssetAttachment | null> {
  const result = await query<AssetAttachmentRow>(
    `SELECT ${SELECT_COLUMNS} FROM asset_attachments a ${USER_JOIN} WHERE a.id = $1`,
    [id],
  );
  return result.rows[0] ? mapAttachment(result.rows[0]) : null;
}

export async function createAssetAttachment(input: {
  assetId: string;
  filePath: string;
  fileName: string;
  fileType: string | null;
  uploadedBy: string;
}): Promise<AssetAttachment> {
  const result = await query<AssetAttachmentRow>(
    `WITH inserted AS (
       INSERT INTO asset_attachments (asset_id, file_path, file_name, file_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, asset_id, file_path, file_name, file_type, uploaded_by, uploaded_at
     )
     SELECT ${SELECT_COLUMNS} FROM inserted a ${USER_JOIN}`,
    [input.assetId, input.filePath, input.fileName, input.fileType, input.uploadedBy],
  );
  return mapAttachment(result.rows[0]);
}

/** Deletes the DB row and returns the deleted attachment (so the caller can remove the disk
 * file); returns null if it didn't exist. */
export async function deleteAssetAttachment(id: number): Promise<AssetAttachment | null> {
  const existing = await getAssetAttachmentById(id);
  if (!existing) return null;
  await query(`DELETE FROM asset_attachments WHERE id = $1`, [id]);
  return existing;
}
