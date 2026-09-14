"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Pencil,
  Printer,
  Building2,
  MapPin,
  Tag,
  ChevronDown,
  ArrowRightLeft,
  Repeat,
  Trash2,
  AlertOctagon,
  BroomSparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AssetAttachments } from "./AssetAttachments";
import { TransferDialog } from "./TransferDialog";
import { ConditionDialog } from "./ConditionDialog";
import { StatusDialog } from "./StatusDialog";
import { DisposalDialog } from "./DisposalDialog";
import { AuditLogTimeline } from "./AuditLogTimeline";
import { MaintenanceTab } from "./MaintenanceTab";
import { useUIStore } from "@/store";
import {
  statusBadgeVariant,
  conditionBadgeVariant,
  formatLookupName,
} from "@/lib/badgeVariants";
import { formatCurrency } from "@/lib/format";
import type { AssetWithRelations } from "@/types/asset";
import type { AssetAttachment } from "@/types/assetAttachment";
import type { AssetAuditLogEntry } from "@/types/auditLog";
import type { AssetMaintenance } from "@/types/maintenance";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";
import type { Vendor } from "@/types/vendor";
import type { AssetCondition } from "@/types/assetCondition";
import type { AssetStatus } from "@/types/assetStatus";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

type ActiveDialog =
  "transfer" | "condition" | "status" | "dispose" | "delete" | null;

export function AssetDetail({
  asset,
  attachments,
  auditLog,
  maintenance,
  canManage,
  isAdmin,
  locations,
  departments,
  vendors,
  conditions,
  statuses,
}: {
  asset: AssetWithRelations;
  attachments: AssetAttachment[];
  auditLog: AssetAuditLogEntry[];
  maintenance: AssetMaintenance[];
  canManage: boolean;
  isAdmin: boolean;
  locations: Location[];
  departments: Department[];
  vendors: Vendor[];
  conditions: AssetCondition[];
  statuses: AssetStatus[];
}) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null);
  const [deleting, setDeleting] = React.useState(false);

  const isDisposed = asset.statusName === "disposed";
  const hasLifecycleActions = canManage && !isDisposed;

  async function handleSoftDelete() {
    setDeleting(true);
    try {
      await axios.delete(`/api/assets/${asset.id}`);
      addToast({ title: "Asset deleted" });
      router.push("/assets");
    } catch (err) {
      addToast({
        title: "Could not delete asset",
        description: errorMessage(err),
        variant: "error",
      });
    } finally {
      setDeleting(false);
      setActiveDialog(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          {asset.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/assets/${asset.id}/image?v=${encodeURIComponent(asset.imagePath)}`}
              alt=""
              className="border-border h-32 w-32 shrink-0 rounded-lg border object-cover"
            />
          ) : (
            <div className="border-border bg-muted flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border">
              <Tag className="text-muted-foreground h-8 w-8" />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-muted-foreground font-mono text-xs">
                  {asset.assetTag}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {asset.name}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/assets/${asset.id}/label`}>
                    <Printer className="h-4 w-4" />
                    Print label
                  </Link>
                </Button>
                {canManage && !isDisposed && (
                  <Button variant="outline" asChild>
                    <Link href={`/assets/${asset.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                )}
                {(hasLifecycleActions || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        Actions
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hasLifecycleActions && (
                        <>
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("transfer")}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                            Transfer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("condition")}
                          >
                            <BroomSparkles className="h-4 w-4" />
                            Change condition
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("status")}
                          >
                            <Repeat className="h-4 w-4" />
                            Change status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("dispose")}
                            className="text-destructive focus:text-destructive"
                          >
                            <AlertOctagon className="h-4 w-4" />
                            Dispose
                          </DropdownMenuItem>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          {hasLifecycleActions && <DropdownMenuSeparator />}
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("delete")}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete (data-entry correction)
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusBadgeVariant(asset.statusName)}>
                {formatLookupName(asset.statusName)}
              </Badge>
              <Badge variant={conditionBadgeVariant(asset.conditionName)}>
                {formatLookupName(asset.conditionName)}
              </Badge>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="text-muted-foreground h-3.5 w-3.5" />
                <span>{asset.locationName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="text-muted-foreground h-3.5 w-3.5" />
                <span>{asset.departmentName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserRound className="text-muted-foreground h-3.5 w-3.5" />
                <span>
                  {asset.assignedUserName ?? asset.ownerName ?? "Unassigned"}
                </span>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewGrid asset={asset} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogTimeline
            entries={auditLog}
            locations={locations}
            departments={departments}
            conditions={conditions}
            statuses={statuses}
          />
        </TabsContent>
        <TabsContent value="attachments">
          <AssetAttachments
            assetId={asset.id}
            initialAttachments={attachments}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenanceTab
            assetId={asset.id}
            initialMaintenance={maintenance}
            vendors={vendors}
            statuses={statuses}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>

      {hasLifecycleActions && (
        <>
          <TransferDialog
            asset={asset}
            locations={locations}
            departments={departments}
            open={activeDialog === "transfer"}
            onOpenChange={(open) => setActiveDialog(open ? "transfer" : null)}
          />
          <ConditionDialog
            assetId={asset.id}
            currentConditionId={asset.conditionId}
            conditions={conditions}
            open={activeDialog === "condition"}
            onOpenChange={(open) => setActiveDialog(open ? "condition" : null)}
          />
          <StatusDialog
            assetId={asset.id}
            currentStatusId={asset.statusId}
            statuses={statuses}
            open={activeDialog === "status"}
            onOpenChange={(open) => setActiveDialog(open ? "status" : null)}
          />
          <DisposalDialog
            assetId={asset.id}
            assetName={asset.name}
            open={activeDialog === "dispose"}
            onOpenChange={(open) => setActiveDialog(open ? "dispose" : null)}
          />
        </>
      )}
      {isAdmin && (
        <ConfirmDialog
          open={activeDialog === "delete"}
          onOpenChange={(open) => setActiveDialog(open ? "delete" : null)}
          title="Delete asset record"
          description={
            <>
              This is for correcting a mistaken entry (e.g. a duplicate),{" "}
              <strong>not</strong> for retiring a real asset — use Dispose for
              that. This removes <strong>{asset.name}</strong> from every list
              and search immediately; the record is kept for forensic purposes
              but is otherwise unreachable.
            </>
          }
          confirmLabel="Delete"
          destructive
          submitting={deleting}
          onConfirm={handleSoftDelete}
        />
      )}
    </div>
  );
}

function OverviewGrid({ asset }: { asset: AssetWithRelations }) {
  const rows: [string, ReactNode][] = [
    ["Category", asset.categoryName],
    ["Model number", asset.modelNumber ?? "—"],
    ["Serial number", asset.serialNumber ?? "—"],
    ["Vendor", asset.vendorName ?? "—"],
    [
      "Purchase date",
      asset.purchaseDate
        ? new Date(asset.purchaseDate).toLocaleDateString()
        : "—",
    ],
    [
      "Purchase cost",
      asset.purchaseCost != null ? formatCurrency(asset.purchaseCost) : "—",
    ],
    [
      "Warranty expiry",
      asset.warrantyExpiry
        ? new Date(asset.warrantyExpiry).toLocaleDateString()
        : "—",
    ],
    [
      "Depreciation method",
      asset.depreciationMethod
        ? formatLookupName(asset.depreciationMethod)
        : "—",
    ],
    [
      "Useful life",
      asset.usefulLifeMonths != null ? `${asset.usefulLifeMonths} months` : "—",
    ],
    [
      "Salvage value",
      asset.salvageValue != null ? formatCurrency(asset.salvageValue) : "—",
    ],
    ["Owner email", asset.ownerEmail ?? "—"],
    ["Created by", asset.createdByName],
    ["Created", new Date(asset.createdAt).toLocaleString()],
    ["Last updated", new Date(asset.updatedAt).toLocaleString()],
  ];
  if (asset.notes) rows.push(["Notes", asset.notes]);

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
