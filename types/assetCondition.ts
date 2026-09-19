export interface AssetCondition {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface AssetConditionInput {
  name: string;
  sortOrder: number;
}
