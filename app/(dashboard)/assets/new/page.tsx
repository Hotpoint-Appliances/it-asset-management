import { requireRole } from "@/lib/auth/session";
import { listCategories } from "@/lib/db/categories";
import { listLocations } from "@/lib/db/locations";
import { listDepartments } from "@/lib/db/departments";
import { listVendors } from "@/lib/db/vendors";
import { listAssetConditions } from "@/lib/db/assetConditions";
import { listAssetStatuses } from "@/lib/db/assetStatuses";
import { AssetForm } from "@/components/assets/AssetForm";

export default async function NewAssetPage() {
  await requireRole(["admin", "asset_manager"]);

  const [categories, locations, departments, vendors, conditions, statuses] =
    await Promise.all([
      listCategories(),
      listLocations(),
      listDepartments(500, 0),
      listVendors(500, 0),
      listAssetConditions(),
      listAssetStatuses(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New asset</h1>
        <p className="text-muted-foreground text-sm">
          Register a new asset in the inventory.
        </p>
      </div>
      <AssetForm
        mode="create"
        categories={categories}
        locations={locations}
        departments={departments.items}
        vendors={vendors.items}
        conditions={conditions}
        statuses={statuses}
      />
    </div>
  );
}
