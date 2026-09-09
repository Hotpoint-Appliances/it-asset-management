export interface Category {
  id: number;
  name: string;
  parentCategoryId: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryInput {
  name: string;
  parentCategoryId: number | null;
  description: string | null;
}
