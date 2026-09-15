"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TreePicker } from "@/components/shared/TreePicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { UserTypeahead } from "./UserTypeahead";
import { useUIStore } from "@/store";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

export interface TransferDialogAsset {
  id: string;
  locationId: number;
  departmentId: number;
  assignedUserId: string | null;
  assignedUserName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
}

/** Transfer action (phase-5-asset-lifecycle Step 1) — location/department/owner change in one
 * submission, from a Dialog per itam-design-system's "quick action" modal guidance. Reused from
 * both the asset detail page and the asset list's row actions (see AssetDetail.tsx and
 * AssetRowActions.tsx), which is why every field it needs comes in via `asset` rather than a
 * full `AssetWithRelations` — the list only has AssetListItem. */
export function TransferDialog({
  asset,
  locations,
  departments,
  open,
  onOpenChange,
}: {
  asset: TransferDialogAsset;
  locations: Location[];
  departments: Department[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [locationId, setLocationId] = React.useState<number | null>(
    asset.locationId,
  );
  const [departmentId, setDepartmentId] = React.useState<number | null>(
    asset.departmentId,
  );
  const [ownerMode, setOwnerMode] = React.useState<"user" | "external">(
    asset.assignedUserId ? "user" : "external",
  );
  const [assignedUserId, setAssignedUserId] = React.useState<string | null>(
    asset.assignedUserId,
  );
  const [assignedUserName, setAssignedUserName] = React.useState<string | null>(
    asset.assignedUserName,
  );
  const [ownerName, setOwnerName] = React.useState(asset.ownerName ?? "");
  const [ownerEmail, setOwnerEmail] = React.useState(asset.ownerEmail ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useSyncOnOpen(open, () => {
    setLocationId(asset.locationId);
    setDepartmentId(asset.departmentId);
    setOwnerMode(asset.assignedUserId ? "user" : "external");
    setAssignedUserId(asset.assignedUserId);
    setAssignedUserName(asset.assignedUserName);
    setOwnerName(asset.ownerName ?? "");
    setOwnerEmail(asset.ownerEmail ?? "");
    setError(null);
  });

  const locationItems = React.useMemo(
    () =>
      locations.map((l) => ({
        id: l.id,
        parentId: l.parentLocationId,
        name: l.name,
      })),
    [locations],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/assets/${asset.id}/transfer`, {
        locationId,
        departmentId,
        assignedUserId: ownerMode === "user" ? assignedUserId : null,
        ownerName: ownerMode === "external" ? ownerName : null,
        ownerEmail: ownerMode === "external" ? ownerEmail : null,
      });
      addToast({ title: "Asset transferred", variant: "success" });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Location</label>
            <TreePicker
              items={locationItems}
              value={locationId}
              onChange={setLocationId}
              placeholder="Select a location"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Department</label>
            <Select
              value={departmentId ?? ""}
              onChange={(e) =>
                setDepartmentId(e.target.value ? Number(e.target.value) : null)
              }
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Owner</span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={ownerMode === "user" ? "default" : "outline"}
                onClick={() => setOwnerMode("user")}
              >
                System user
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ownerMode === "external" ? "default" : "outline"}
                onClick={() => setOwnerMode("external")}
              >
                External / no login
              </Button>
            </div>
          </div>
          {ownerMode === "user" ? (
            <UserTypeahead
              value={assignedUserId}
              displayName={assignedUserName}
              onSelect={(u) => {
                setAssignedUserId(u?.id ?? null);
                setAssignedUserName(u?.fullName ?? null);
              }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Owner name</label>
                <Input
                  required={ownerMode === "external"}
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Owner email</label>
                <Input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Transferring…" : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
