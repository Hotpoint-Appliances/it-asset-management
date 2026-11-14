"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import type { ReactNode } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowsLeftRightIcon,
  BroomIcon,
  BuildingsIcon,
  CaretDownIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PrinterIcon,
  RepeatIcon,
  SignatureIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";
import { RefreshButton } from "@/components/shared/RefreshButton";
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
import { DownloadButton } from "@/components/shared/DownloadButton";
import { AssetAttachments } from "./AssetAttachments";
import { TransferDialog } from "./TransferDialog";
import { ConditionDialog } from "./ConditionDialog";
import { StatusDialog } from "./StatusDialog";
import { DisposalDialog } from "./DisposalDialog";
import { AuditLogTimeline } from "./AuditLogTimeline";
import { MaintenanceTab } from "./MaintenanceTab";
import { AccessoriesTab } from "./AccessoriesTab";
import { IssueFormDialog } from "./IssueFormDialog";
import { IssueFormsTab } from "./IssueFormsTab";
import { canIssueForm } from "@/lib/issueForms/rules";
import { useUIStore } from "@/store";
import {
  statusBadgeVariant,
  conditionBadgeVariant,
  formatLookupName,
} from "@/lib/badgeVariants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { AssetWithRelations } from "@/types/asset";
import type { AssetAttachment } from "@/types/assetAttachment";
import type { AssetAuditLogEntry } from "@/types/auditLog";
import type { AssetMaintenance } from "@/types/maintenance";
import type { AssetDisposal } from "@/types/disposal";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";
import type { Vendor } from "@/types/vendor";
import type { AssetCondition } from "@/types/assetCondition";
import type { AssetStatus } from "@/types/assetStatus";
import type { Accessory, AssetAccessory } from "@/types/accessory";
import type { IssueForm } from "@/types/issueForm";
import { withBasePath } from "@/lib/basePath";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

type ActiveDialog =
  "transfer" | "condition" | "status" | "dispose" | "delete" | "issue" | null;

export function AssetDetail({
  asset,
  attachments,
  accessories,
  accessoryCatalog,
  auditLog,
  maintenance,
  disposal,
  issueForms,
  initialTab,
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
  accessories: AssetAccessory[];
  /** Active catalog entries for the Accessories tab's picker. */
  accessoryCatalog: Accessory[];
  auditLog: AssetAuditLogEntry[];
  maintenance: AssetMaintenance[];
  /** Present only for a disposed asset. */
  disposal: AssetDisposal | null;
  /** Empty unless `canManage`: forms carry payroll numbers. */
  issueForms: IssueForm[];
  /** The tab to open on; a link back from a sub-page can ask for the one it came from. */
  initialTab: "overview" | "issue-forms";
  canManage: boolean;
  isAdmin: boolean;
  locations: Location[];
  departments: Department[];
  vendors: Vendor[];
  conditions: AssetCondition[];
  statuses: AssetStatus[];
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [activeDialog, setActiveDialog] = React.useState<ActiveDialog>(null);
  const [deleting, setDeleting] = React.useState(false);

  const isDisposed = asset.statusName === "disposed";
  const hasLifecycleActions = canManage && !isDisposed;

  async function handleSoftDelete() {
    setDeleting(true);
    try {
      await axios.delete(`/api/assets/${asset.id}`);
      router.pushFresh("/assets", () =>
        addToast({ title: "Asset deleted", variant: "success" }),
      );
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
              src={withBasePath(
                `/api/assets/${asset.id}/image?v=${encodeURIComponent(asset.imagePath)}`,
              )}
              alt=""
              className="border-border h-32 w-32 shrink-0 rounded-lg border object-cover"
            />
          ) : (
            <div className="border-border bg-muted flex h-32 w-32 shrink-0 items-center justify-center rounded-lg border">
              <TagIcon
                weight="bold"
                className="text-muted-foreground h-8 w-8"
              />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-muted-foreground font-mono text-xs">
                  {asset.assetTag}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight break-words">
                  {asset.name}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <RefreshButton />
                <Button variant="outline" asChild>
                  <Link href={`/assets/${asset.id}/label`}>
                    <PrinterIcon weight="bold" className="h-4 w-4" />
                    Print label
                  </Link>
                </Button>
                {canManage && !isDisposed && (
                  <Button variant="outline" asChild>
                    <Link href={`/assets/${asset.id}/edit`}>
                      <PencilSimpleIcon weight="bold" className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                )}
                {(hasLifecycleActions || isAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        Actions
                        <CaretDownIcon weight="bold" className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hasLifecycleActions && (
                        <>
                          {canIssueForm(asset.statusName) && (
                            <DropdownMenuItem
                              onSelect={() => setActiveDialog("issue")}
                            >
                              <SignatureIcon
                                weight="bold"
                                className="h-4 w-4"
                              />
                              Issue form
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("transfer")}
                          >
                            <ArrowsLeftRightIcon
                              weight="bold"
                              className="h-4 w-4"
                            />
                            Transfer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("condition")}
                          >
                            <BroomIcon weight="bold" className="h-4 w-4" />
                            Change condition
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("status")}
                          >
                            <RepeatIcon weight="bold" className="h-4 w-4" />
                            Change status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setActiveDialog("dispose")}
                            className="text-destructive focus:text-destructive"
                          >
                            <WarningOctagonIcon
                              weight="bold"
                              className="h-4 w-4"
                            />
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
                            <TrashIcon weight="bold" className="h-4 w-4" />
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
                <MapPinIcon
                  weight="bold"
                  className="text-muted-foreground h-3.5 w-3.5"
                />
                <span>{asset.locationName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BuildingsIcon
                  weight="bold"
                  className="text-muted-foreground h-3.5 w-3.5"
                />
                <span>{asset.departmentName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserIcon
                  weight="bold"
                  className="text-muted-foreground h-3.5 w-3.5"
                />
                <span>
                  {asset.assignedUserName ?? asset.ownerName ?? "Unassigned"}
                </span>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accessories">Accessories</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          {canManage && (
            <TabsTrigger value="issue-forms">Issue Forms</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4">
            {disposal && (
              <DisposalSummary assetId={asset.id} disposal={disposal} />
            )}
            <OverviewGrid asset={asset} />
          </div>
        </TabsContent>
        <TabsContent value="accessories">
          <AccessoriesTab
            assetId={asset.id}
            statusName={asset.statusName}
            accessories={accessories}
            catalog={accessoryCatalog}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="audit">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <DownloadButton
                href={`/api/reports/audit-trail?assetId=${asset.id}`}
                variant="outline"
                size="sm"
              >
                Export audit trail
              </DownloadButton>
            </div>
            <AuditLogTimeline
              entries={auditLog}
              locations={locations}
              departments={departments}
              conditions={conditions}
              statuses={statuses}
            />
          </div>
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
            currentStatusId={asset.statusId}
            canManage={canManage && !isDisposed}
          />
        </TabsContent>
        {canManage && (
          <TabsContent value="issue-forms">
            <IssueFormsTab assetId={asset.id} forms={issueForms} />
          </TabsContent>
        )}
      </Tabs>

      {hasLifecycleActions && (
        <>
          <IssueFormDialog
            assetId={asset.id}
            open={activeDialog === "issue"}
            onOpenChange={(open) => setActiveDialog(open ? "issue" : null)}
          />
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
              <strong>not</strong> for retiring a real asset. Use Dispose for
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

function DisposalSummary({
  assetId,
  disposal,
}: {
  assetId: string;
  disposal: AssetDisposal;
}) {
  const rows: [string, ReactNode][] = [
    ["Disposal date", formatDate(disposal.disposalDate)],
    ["Method", formatLookupName(disposal.disposalMethod)],
    [
      "Disposal value",
      disposal.disposalValue != null
        ? formatCurrency(disposal.disposalValue)
        : "N/A",
    ],
    ["Approved by", disposal.approvedByName],
  ];
  if (disposal.notes) rows.push(["Notes", disposal.notes]);
  if (disposal.attachmentPath) {
    rows.push([
      "Attachment",
      <a
        key="attachment"
        href={withBasePath(`/api/assets/${assetId}/dispose/attachment`)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-4 hover:underline"
      >
        View disposal document
      </a>,
    ]);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <WarningOctagonIcon
            weight="bold"
            className="text-destructive h-4 w-4"
          />
          Disposal record
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
              </dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function OverviewGrid({ asset }: { asset: AssetWithRelations }) {
  const rows: [string, ReactNode][] = [
    ["Category", asset.categoryName],
    ["Model number", asset.modelNumber ?? "N/A"],
    ["Serial number", asset.serialNumber],
    ["Vendor", asset.vendorName ?? "N/A"],
    [
      "Purchase date",
      asset.purchaseDate ? formatDate(asset.purchaseDate) : "N/A",
    ],
    [
      "Purchase cost",
      asset.purchaseCost != null ? formatCurrency(asset.purchaseCost) : "N/A",
    ],
    [
      "Warranty expiry",
      asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : "N/A",
    ],
    [
      "Depreciation method",
      asset.depreciationMethod
        ? formatLookupName(asset.depreciationMethod)
        : "N/A",
    ],
    [
      "Useful life",
      asset.usefulLifeMonths != null
        ? `${asset.usefulLifeMonths} months`
        : "N/A",
    ],
    [
      "Salvage value",
      asset.salvageValue != null ? formatCurrency(asset.salvageValue) : "N/A",
    ],
    ["Owner email", asset.ownerEmail ?? "N/A"],
    ["Created by", asset.createdByName],
    ["Created", formatDateTime(asset.createdAt)],
    ["Last updated", formatDateTime(asset.updatedAt)],
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
