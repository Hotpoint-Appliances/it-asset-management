import type { Metadata } from "next";
import { listVendors } from "@/lib/db/vendors";
import { VendorsManager } from "./VendorsManager";

export const metadata: Metadata = {
  title: "Vendors",
  description:
    "Manage the suppliers and repair vendors assets are bought from and serviced by.",
};

export default async function VendorsPage() {
  const { items } = await listVendors(200, 0);
  return <VendorsManager initialVendors={items} />;
}
