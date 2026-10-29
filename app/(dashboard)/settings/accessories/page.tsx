import type { Metadata } from "next";
import { listAccessories } from "@/lib/db/accessories";
import { AccessoriesManager } from "./AccessoriesManager";

export const metadata: Metadata = {
  title: "Accessories",
  description: "Manage the accessories that can be issued with an asset.",
};

export default async function AccessoriesPage() {
  const accessories = await listAccessories();
  return <AccessoriesManager initialAccessories={accessories} />;
}
