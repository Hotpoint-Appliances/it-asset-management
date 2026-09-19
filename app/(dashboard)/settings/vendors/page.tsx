import { listVendors } from "@/lib/db/vendors";
import { VendorsManager } from "./VendorsManager";

export default async function VendorsPage() {
  const { items } = await listVendors(200, 0);
  return <VendorsManager initialVendors={items} />;
}
