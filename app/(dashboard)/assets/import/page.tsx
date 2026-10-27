import { requireRole } from "@/lib/auth/session";
import { AssetImport } from "@/components/assets/AssetImport";

export default async function ImportAssetsPage() {
  await requireRole(["admin", "asset_manager"]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import assets</h1>
        <p className="text-muted-foreground text-sm">
          Add many assets at once from an Excel file.
        </p>
      </div>
      <AssetImport />
    </div>
  );
}
