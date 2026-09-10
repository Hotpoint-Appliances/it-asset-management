"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Pencil, Printer, User as UserIcon, Building2, MapPin, Tag, History, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { AssetAttachments } from "./AssetAttachments";
import { statusBadgeVariant, conditionBadgeVariant, formatLookupName } from "@/lib/badgeVariants";
import { formatCurrency } from "@/lib/format";
import type { AssetWithRelations } from "@/types/asset";
import type { AssetAttachment } from "@/types/assetAttachment";

export function AssetDetail({
  asset,
  attachments,
  canManage,
}: {
  asset: AssetWithRelations;
  attachments: AssetAttachment[];
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          {asset.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/assets/${asset.id}/image`}
              alt=""
              className="border-border h-32 w-32 shrink-0 rounded-md border object-cover"
            />
          ) : (
            <div className="border-border bg-muted flex h-32 w-32 shrink-0 items-center justify-center rounded-md border">
              <Tag className="text-muted-foreground h-8 w-8" />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-muted-foreground font-mono text-xs">{asset.assetTag}</p>
                <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/assets/${asset.id}/label`}>
                    <Printer className="h-4 w-4" />
                    Print label
                  </Link>
                </Button>
                {canManage && (
                  <Button asChild>
                    <Link href={`/assets/${asset.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
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
                <UserIcon className="text-muted-foreground h-3.5 w-3.5" />
                <span>{asset.assignedUserName ?? asset.ownerName ?? "Unassigned"}</span>
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
          <EmptyState
            icon={History}
            title="Audit log coming in Phase 5"
            description="Transfers, condition/status changes, maintenance, and disposal will build out a full timeline here."
          />
        </TabsContent>
        <TabsContent value="attachments">
          <AssetAttachments assetId={asset.id} initialAttachments={attachments} canManage={canManage} />
        </TabsContent>
        <TabsContent value="maintenance">
          <EmptyState
            icon={Wrench}
            title="Maintenance tracking coming in Phase 5"
            description="Repair, service, and inspection records will live here."
          />
        </TabsContent>
      </Tabs>
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
      asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—",
    ],
    ["Purchase cost", asset.purchaseCost != null ? formatCurrency(asset.purchaseCost) : "—"],
    [
      "Warranty expiry",
      asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : "—",
    ],
    [
      "Depreciation method",
      asset.depreciationMethod ? formatLookupName(asset.depreciationMethod) : "—",
    ],
    ["Useful life", asset.usefulLifeMonths != null ? `${asset.usefulLifeMonths} months` : "—"],
    ["Salvage value", asset.salvageValue != null ? formatCurrency(asset.salvageValue) : "—"],
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
