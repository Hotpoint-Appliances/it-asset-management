import { listAccessories } from "@/lib/db/accessories";
import { AccessoriesManager } from "./AccessoriesManager";

export default async function AccessoriesPage() {
  const accessories = await listAccessories();
  return <AccessoriesManager initialAccessories={accessories} />;
}
