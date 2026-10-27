/** Catalog entry, managed under Settings > Accessories. */
export interface Accessory {
  id: number;
  name: string;
  description: string | null;
  /** Retired accessories stay on the assets they're attached to but leave every picker. */
  isActive: boolean;
  sortOrder: number;
  /** Number of live (non-soft-deleted) assets it's attached to, which blocks deleting it. */
  assetCount: number;
  createdAt: string;
}

export interface AccessoryInput {
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** One accessory attached to an asset (an `asset_accessories` row plus the catalog name). */
export interface AssetAccessory {
  accessoryId: number;
  name: string;
  isActive: boolean;
  quantity: number;
  notes: string | null;
}

/** What the create/edit form and the detail tab submit: the asset's full accessory list. */
export interface AssetAccessoryInput {
  accessoryId: number;
  quantity: number;
  notes: string | null;
}
