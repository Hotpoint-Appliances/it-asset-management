export interface AssetStatus {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface AssetStatusInput {
  name: string;
  sortOrder: number;
}
