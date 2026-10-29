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
  byLocation: CountByName[];
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

/** Non-disposed assets bucketed by age since purchase, plus the refresh outlook from each
 * asset's useful life. Assets without a purchase date land in `unknownAge`; ones without a
 * useful life can't be judged and are left out of the refresh counts. */
export interface LifecycleOverview {
  ageBands: { label: string; count: number }[];
  unknownAge: number;
  pastUsefulLife: number;
  /** Reaching the end of their useful life within the next `dueWithinMonths` months. */
  dueSoon: number;
  dueWithinMonths: number;
  /** Past or nearing end of life, oldest end-of-life first (capped). */
  refreshDue: RefreshDueItem[];
}

export interface RefreshDueItem {
  id: string;
  assetTag: string;
  name: string;
  endOfLife: string;
  /** Negative once past end of life. */
  daysRemaining: number;
}
