import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getAssetById } from "@/lib/db/assets";
import { AssetQrCode } from "@/components/assets/AssetQrCode";

/** Dedicated print-friendly label view (phase-4-asset-management Step 6). Stays inside the
 * (dashboard) group like every other asset page; AppShell hides its chrome under print via the
 * print:hidden utility on Sidebar/Topbar instead of opting this route out of the group. */
export default async function AssetLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const asset = await getAssetById(id, session);
  if (!asset) notFound();

  return (
    <div className="flex flex-col items-center gap-4 py-8 print:gap-0 print:py-0">
      <div className="border-border flex w-72 flex-col items-center gap-3 rounded-md border p-6 print:w-[3in] print:gap-2 print:rounded-none print:border-black print:p-4">
        <AssetQrCode assetId={asset.id} size={200} />
        <div className="text-center">
          <p className="font-mono text-sm font-semibold">{asset.assetTag}</p>
          <p className="text-sm">{asset.name}</p>
        </div>
      </div>
      <p className="text-muted-foreground text-sm print:hidden">
        Use your browser&apos;s print dialog (Ctrl/Cmd+P) to print this label.
      </p>
    </div>
  );
}
