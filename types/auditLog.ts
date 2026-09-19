export interface AssetAuditLogEntry {
  id: number;
  assetId: string;
  actionType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  performedBy: string;
  performedByName: string;
  performedAt: string;
}
