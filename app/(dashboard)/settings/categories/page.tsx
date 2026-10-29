import type { Metadata } from "next";
import { listCategories } from "@/lib/db/categories";
import { CategoriesManager } from "./CategoriesManager";

export const metadata: Metadata = {
  title: "Categories",
  description: "Manage the asset category hierarchy.",
};

export default async function CategoriesPage() {
  const categories = await listCategories();
  return <CategoriesManager initialCategories={categories} />;
}
