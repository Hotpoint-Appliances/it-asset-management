export interface AssetAuditLogEntry {
  id: number;
  assetId: string;
  actionType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  /** Resolved display name for values that are ids into a large table (currently users). */
  oldValueLabel: string | null;
  newValueLabel: string | null;
  note: string | null;
  performedBy: string;
  performedByName: string;
  performedAt: string;
}
