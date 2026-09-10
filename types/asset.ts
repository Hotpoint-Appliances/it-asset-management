export type DepreciationMethod = "straight_line" | "declining_balance";

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  categoryId: number;
  modelNumber: string | null;
  serialNumber: string | null;
  locationId: number;
  departmentId: number;
  imagePath: string | null;
  assignedUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  conditionId: number;
  statusId: number;
  vendorId: number | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiry: string | null;
  depreciationMethod: DepreciationMethod | null;
  usefulLifeMonths: number | null;
  salvageValue: number | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Asset plus the human-readable names of everything it references — what the detail page and
 * edit form need instead of raw ids. */
export interface AssetWithRelations extends Asset {
  categoryName: string;
  locationName: string;
  departmentName: string;
  conditionName: string;
  statusName: string;
  vendorName: string | null;
  assignedUserName: string | null;
  createdByName: string;
}

/** Slim row shape for the asset list table — avoids shipping every column to the client.
 * Carries locationId/departmentId/assignedUserId/ownerEmail (not just the *Name display
 * columns) so the list row's Transfer dialog (phase-5-asset-lifecycle) can prefill from here
 * without a second fetch, per itam-design-system's "row actions gain Transfer/Dispose". */
export interface AssetListItem {
  id: string;
  assetTag: string;
  name: string;
  imagePath: string | null;
  categoryName: string;
  statusName: string;
  conditionName: string;
  locationId: number;
  locationName: string;
  departmentId: number;
  departmentName: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
}

export interface AssetInput {
  assetTag: string;
  name: string;
  categoryId: number;
  modelNumber: string | null;
  serialNumber: string | null;
  locationId: number;
  departmentId: number;
  assignedUserId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  conditionId: number;
  statusId: number;
  vendorId: number | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiry: string | null;
  depreciationMethod: DepreciationMethod | null;
  usefulLifeMonths: number | null;
  salvageValue: number | null;
  notes: string | null;
}

export interface AssetFilters {
  statusIds: number[];
  categoryIds: number[];
  departmentIds: number[];
  locationIds: number[];
  conditionIds: number[];
  search: string | null;
  limit: number;
  offset: number;
}
