export interface CountByName {
  id: number;
  name: string;
  count: number;
}

export interface FleetOverview {
  /** Every non-deleted asset, disposed included. */
  total: number;
  /** Total minus disposed: the assets still on the books. */
  inService: number;
  byStatus: CountByName[];
  /** Disposed assets are excluded from the breakdowns below. */
  byCategory: CountByName[];
  byDepartment: CountByName[];
}

export interface WarrantyExpiringItem {
  id: string;
  assetTag: string;
  name: string;
  departmentName: string;
  warrantyExpiry: string;
  daysRemaining: number;
}

export interface RecentActivityItem {
  id: number;
  assetId: string;
  assetTag: string;
  assetName: string;
  actionType: string;
  fieldName: string | null;
  note: string | null;
  performedByName: string;
  performedAt: string;
}

export interface AssetInRepairItem {
  maintenanceId: number;
  assetId: string;
  assetTag: string;
  assetName: string;
  maintenanceType: string;
  vendorName: string | null;
  startedAt: string;
}
