"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import axios from "axios";
import { Image as LucideImage, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TreePicker } from "@/components/shared/TreePicker";
import { UserTypeahead } from "./UserTypeahead";
import { useUIStore } from "@/store";
import type { AssetWithRelations } from "@/types/asset";
import type { Category } from "@/types/category";
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border flex flex-col gap-4 border-b pb-6 last:border-b-0 last:pb-0">
      <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

type OwnerMode = "user" | "external";

interface FormState {
  assetTag: string;
  name: string;
  categoryId: number | null;
  modelNumber: string;
  serialNumber: string;
  locationId: number | null;
  departmentId: number | null;
  ownerMode: OwnerMode;
  assignedUserId: string | null;
  assignedUserName: string | null;
  ownerName: string;
  ownerEmail: string;
  conditionId: number | null;
  statusId: number | null;
  statusTouched: boolean;
  vendorId: number | null;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiry: string;
  depreciationMethod: "" | "straight_line" | "declining_balance";
  usefulLifeMonths: string;
  salvageValue: string;
  notes: string;
}

function initialState(
  asset: AssetWithRelations | undefined,
  defaultStatusId: number | null,
): FormState {
  return {
    assetTag: asset?.assetTag ?? "",
    name: asset?.name ?? "",
    categoryId: asset?.categoryId ?? null,
    modelNumber: asset?.modelNumber ?? "",
    serialNumber: asset?.serialNumber ?? "",
    locationId: asset?.locationId ?? null,
    departmentId: asset?.departmentId ?? null,
    ownerMode: asset?.assignedUserId ? "user" : "external",
    assignedUserId: asset?.assignedUserId ?? null,
    assignedUserName: asset?.assignedUserName ?? null,
    ownerName: asset?.ownerName ?? "",
    ownerEmail: asset?.ownerEmail ?? "",
    conditionId: asset?.conditionId ?? null,
    statusId: asset?.statusId ?? defaultStatusId,
    statusTouched: !!asset,
    vendorId: asset?.vendorId ?? null,
    purchaseDate: asset?.purchaseDate?.slice(0, 10) ?? "",
    purchaseCost: asset?.purchaseCost != null ? String(asset.purchaseCost) : "",
    warrantyExpiry: asset?.warrantyExpiry?.slice(0, 10) ?? "",
    depreciationMethod: asset?.depreciationMethod ?? "",
    usefulLifeMonths:
      asset?.usefulLifeMonths != null ? String(asset.usefulLifeMonths) : "",
    salvageValue: asset?.salvageValue != null ? String(asset.salvageValue) : "",
    notes: asset?.notes ?? "",
  };
}

export function AssetForm({
  mode,
  asset,
  categories,
  locations,
  departments,
  vendors,
  conditions,
  statuses,
}: {
  mode: "create" | "edit";
  asset?: AssetWithRelations;
  categories: Category[];
  locations: Location[];
  departments: Department[];
  vendors: Vendor[];
  conditions: AssetCondition[];
  statuses: AssetStatus[];
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);

  const defaultStatusId = React.useMemo(() => {
    const inStorage = statuses.find((s) => s.name === "in_storage");
    return inStorage?.id ?? statuses[0]?.id ?? null;
  }, [statuses]);
  const activeStatusId = React.useMemo(
    () => statuses.find((s) => s.name === "active")?.id ?? null,
    [statuses],
  );

  const [form, setForm] = React.useState<FormState>(() =>
    initialState(asset, defaultStatusId),
  );
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(
    asset?.imagePath
      ? `/api/assets/${asset.id}/image?v=${encodeURIComponent(asset.imagePath)}`
      : null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const categoryItems = React.useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        parentId: c.parentCategoryId,
        name: c.name,
      })),
    [categories],
  );
  const locationItems = React.useMemo(
    () =>
      locations.map((l) => ({
        id: l.id,
        parentId: l.parentLocationId,
        name: l.name,
      })),
    [locations],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Per docs/asset-lifecycle-flow.md: default status is in_storage, unless an owner is set at
  // creation time, in which case active. Only auto-applies until the user picks a status
  // themselves, and only on create — editing an existing asset never silently changes status.
  // Applied at each owner-affecting call site (not a useEffect) so it stays one state update.
  function withDefaultStatus(next: FormState): FormState {
    if (mode !== "create" || next.statusTouched) return next;
    const hasOwner =
      next.ownerMode === "user"
        ? !!next.assignedUserId
        : !!next.ownerName.trim();
    const statusId = hasOwner
      ? (activeStatusId ?? defaultStatusId)
      : defaultStatusId;
    return statusId != null ? { ...next, statusId } : next;
  }

  function updateOwner(patch: Partial<FormState>) {
    setForm((prev) => withDefaultStatus({ ...prev, ...patch }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("assetTag", form.assetTag);
    formData.set("name", form.name);
    if (form.categoryId != null)
      formData.set("categoryId", String(form.categoryId));
    formData.set("modelNumber", form.modelNumber);
    formData.set("serialNumber", form.serialNumber);
    if (form.locationId != null)
      formData.set("locationId", String(form.locationId));
    if (form.departmentId != null)
      formData.set("departmentId", String(form.departmentId));
    if (form.ownerMode === "user") {
      if (form.assignedUserId)
        formData.set("assignedUserId", form.assignedUserId);
    } else {
      formData.set("ownerName", form.ownerName);
      formData.set("ownerEmail", form.ownerEmail);
    }
    if (form.conditionId != null)
      formData.set("conditionId", String(form.conditionId));
    if (form.statusId != null) formData.set("statusId", String(form.statusId));
    if (form.vendorId != null) formData.set("vendorId", String(form.vendorId));
    formData.set("purchaseDate", form.purchaseDate);
    formData.set("purchaseCost", form.purchaseCost);
    formData.set("warrantyExpiry", form.warrantyExpiry);
    formData.set("depreciationMethod", form.depreciationMethod);
    formData.set("usefulLifeMonths", form.usefulLifeMonths);
    formData.set("salvageValue", form.salvageValue);
    formData.set("notes", form.notes);
    if (imageFile) formData.set("image", imageFile);

    try {
      if (mode === "create") {
        const res = await axios.post<{ asset: { id: string } }>(
          "/api/assets",
          formData,
        );
        addToast({ title: "Asset created", variant: "success" });
        router.push(`/assets/${res.data.asset.id}`);
      } else if (asset) {
        await axios.patch(`/api/assets/${asset.id}`, formData);
        addToast({ title: "Asset updated", variant: "success" });
        router.push(`/assets/${asset.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Section title="Basic information">
        <Field label="Asset tag" htmlFor="asset-tag">
          <Input
            id="asset-tag"
            required
            value={form.assetTag}
            onChange={(e) => update("assetTag", e.target.value)}
          />
        </Field>
        <Field label="Name" htmlFor="asset-name">
          <Input
            id="asset-name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>
        <Field label="Category" htmlFor="asset-category">
          <TreePicker
            id="asset-category"
            items={categoryItems}
            value={form.categoryId}
            onChange={(v) => update("categoryId", v)}
            placeholder="Select a category"
          />
        </Field>
        <Field label="Model number" htmlFor="asset-model">
          <Input
            id="asset-model"
            value={form.modelNumber}
            onChange={(e) => update("modelNumber", e.target.value)}
          />
        </Field>
        <Field label="Serial number" htmlFor="asset-serial">
          <Input
            id="asset-serial"
            value={form.serialNumber}
            onChange={(e) => update("serialNumber", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Assignment">
        <Field label="Location" htmlFor="asset-location">
          <TreePicker
            id="asset-location"
            items={locationItems}
            value={form.locationId}
            onChange={(v) => update("locationId", v)}
            placeholder="Select a location"
          />
        </Field>
        <Field label="Department" htmlFor="asset-department">
          <Select
            id="asset-department"
            required
            value={form.departmentId ?? ""}
            onChange={(e) =>
              update(
                "departmentId",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          >
            <option value="" disabled>
              Select a department
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Owner</span>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={form.ownerMode === "user" ? "default" : "outline"}
              onClick={() => updateOwner({ ownerMode: "user" })}
            >
              System user
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.ownerMode === "external" ? "default" : "outline"}
              onClick={() => updateOwner({ ownerMode: "external" })}
            >
              External / no login
            </Button>
          </div>
        </div>

        {form.ownerMode === "user" ? (
          <div className="sm:col-span-2">
            <UserTypeahead
              value={form.assignedUserId}
              displayName={form.assignedUserName}
              onSelect={(u) =>
                updateOwner({
                  assignedUserId: u?.id ?? null,
                  assignedUserName: u?.fullName ?? null,
                })
              }
            />
          </div>
        ) : (
          <>
            <Field label="Owner name" htmlFor="asset-owner-name">
              <Input
                id="asset-owner-name"
                required={form.ownerMode === "external"}
                value={form.ownerName}
                onChange={(e) => updateOwner({ ownerName: e.target.value })}
              />
            </Field>
            <Field label="Owner email" htmlFor="asset-owner-email">
              <Input
                id="asset-owner-email"
                type="email"
                value={form.ownerEmail}
                onChange={(e) => update("ownerEmail", e.target.value)}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Condition & status">
        <Field label="Condition" htmlFor="asset-condition">
          <Select
            id="asset-condition"
            required
            value={form.conditionId ?? ""}
            onChange={(e) =>
              update(
                "conditionId",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          >
            <option value="" disabled>
              Select a condition
            </option>
            {conditions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="asset-status">
          <Select
            id="asset-status"
            required
            value={form.statusId ?? ""}
            onChange={(e) => {
              update("statusTouched", true);
              update(
                "statusId",
                e.target.value ? Number(e.target.value) : null,
              );
            }}
          >
            <option value="" disabled>
              Select a status
            </option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title="Procurement">
        <Field label="Vendor" htmlFor="asset-vendor">
          <Select
            id="asset-vendor"
            value={form.vendorId ?? ""}
            onChange={(e) =>
              update("vendorId", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">None</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Purchase date" htmlFor="asset-purchase-date">
          <Input
            id="asset-purchase-date"
            type="date"
            value={form.purchaseDate}
            onChange={(e) => update("purchaseDate", e.target.value)}
          />
        </Field>
        <Field label="Purchase cost (KES)" htmlFor="asset-purchase-cost">
          <Input
            id="asset-purchase-cost"
            type="number"
            step="0.01"
            min="0"
            value={form.purchaseCost}
            onChange={(e) => update("purchaseCost", e.target.value)}
          />
        </Field>
        <Field label="Warranty expiry" htmlFor="asset-warranty-expiry">
          <Input
            id="asset-warranty-expiry"
            type="date"
            value={form.warrantyExpiry}
            onChange={(e) => update("warrantyExpiry", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Depreciation">
        <Field label="Method" htmlFor="asset-depreciation-method">
          <Select
            id="asset-depreciation-method"
            value={form.depreciationMethod}
            onChange={(e) =>
              update(
                "depreciationMethod",
                e.target.value as FormState["depreciationMethod"],
              )
            }
          >
            <option value="">Not depreciated</option>
            <option value="straight_line">Straight line</option>
            <option value="declining_balance">Declining balance</option>
          </Select>
        </Field>
        <Field label="Useful life (months)" htmlFor="asset-useful-life">
          <Input
            id="asset-useful-life"
            type="number"
            min="0"
            value={form.usefulLifeMonths}
            onChange={(e) => update("usefulLifeMonths", e.target.value)}
          />
        </Field>
        <Field label="Salvage value (KES)" htmlFor="asset-salvage-value">
          <Input
            id="asset-salvage-value"
            type="number"
            step="0.01"
            min="0"
            value={form.salvageValue}
            onChange={(e) => update("salvageValue", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Image & notes">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Image</span>
          <div className="flex items-center gap-3">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt=""
                className="border-border h-16 w-16 rounded-lg border object-cover"
              />
            ) : (
              <div className="border-border bg-muted flex h-16 w-16 items-center justify-center rounded-lg border">
                <LucideImage className="text-muted-foreground h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <Input
                id="asset-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearImage}
                  className="w-fit gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="asset-notes" className="text-sm font-medium">
            Notes
          </label>
          <textarea
            id="asset-notes"
            rows={4}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="border-border bg-background focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </div>
      </Section>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create asset"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
