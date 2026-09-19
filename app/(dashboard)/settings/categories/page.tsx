import { listCategories } from "@/lib/db/categories";
import { CategoriesManager } from "./CategoriesManager";

export default async function CategoriesPage() {
  const categories = await listCategories();
  return <CategoriesManager initialCategories={categories} />;
}
