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

/** Slim row shape for the asset list table — avoids shipping every column to the client. */
export interface AssetListItem {
  id: string;
  assetTag: string;
  name: string;
  imagePath: string | null;
  categoryName: string;
  statusName: string;
  conditionName: string;
  locationName: string;
  departmentName: string;
  assignedUserName: string | null;
  ownerName: string | null;
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
