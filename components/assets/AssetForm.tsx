"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import axios from "axios";
import { Image as LucideImage, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { TreePicker } from "@/components/shared/TreePicker";
import { UserTypeahead } from "./UserTypeahead";
import {
  AccessoriesEditor,
  accessoriesPayload,
  accessoryOptions,
  rowsFromAccessories,
  type AccessoryRow,
} from "./AccessoriesEditor";
import { useUIStore } from "@/store";
import type { AssetWithRelations } from "@/types/asset";
import type { Category } from "@/types/category";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";
import type { Vendor } from "@/types/vendor";
import type { AssetCondition } from "@/types/assetCondition";
import type { AssetStatus } from "@/types/assetStatus";
import type { Accessory, AssetAccessory } from "@/types/accessory";
import { canEditAccessories } from "@/lib/assetAccessories";
import { formatLookupName } from "@/lib/badgeVariants";
import { formatCurrency } from "@/lib/format";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { PresetInput, type Preset } from "@/components/shared/PresetInput";
import { ConfirmSummary, useConfirm } from "@/components/shared/ConfirmDialog";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors, looksLikeEmail } from "@/lib/hooks/useFieldErrors";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

function Field({
  label,
  htmlFor,
  required,
  error,
  errorId,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  /** Client-side field error (useFieldErrors); the control itself carries the matching
   * aria-invalid/aria-describedby. */
  error?: string;
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {errorId && <FieldError id={errorId} message={error} />}
    </div>
  );
}

/** Mirrors lib/files/upload.ts's image limit, so an oversized file is caught before upload. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type AssetField =
  | "assetTag"
  | "name"
  | "categoryId"
  | "locationId"
  | "departmentId"
  | "assignedUserId"
  | "ownerName"
  | "ownerEmail"
  | "conditionId"
  | "statusId"
  | "purchaseCost"
  | "usefulLifeMonths"
  | "salvageValue"
  | "image";

const NON_NEGATIVE = "Enter an amount of 0 or more, or leave it blank.";

function notNonNegative(value: string): boolean {
  return value.trim() !== "" && !(Number(value) >= 0);
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

const NO_ACCESSORIES: AssetAccessory[] = [];

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
  depreciationMethod: "" | "straight_line";
  usefulLifeMonths: string;
  salvageValue: string;
  notes: string;
}

/** The company's standard depreciation terms; anything else goes through "Custom…". */
const USEFUL_LIFE_PRESETS: Preset[] = [36, 60].map((months) => ({
  value: String(months),
  label: `${months} months (${months / 12} years)`,
}));
const SALVAGE_VALUE_PRESETS: Preset[] = [7000, 12000, 20000].map((amount) => ({
  value: String(amount),
  label: formatCurrency(amount),
}));

/** Labels for the edit confirm's "changed fields" list; owner fields collapse into one entry. */
const FIELD_LABELS: Partial<Record<keyof FormState, string>> = {
  assetTag: "Asset tag",
  name: "Name",
  categoryId: "Category",
  modelNumber: "Model number",
  serialNumber: "Serial number",
  locationId: "Location",
  departmentId: "Department",
  ownerMode: "Owner",
  assignedUserId: "Owner",
  ownerName: "Owner",
  ownerEmail: "Owner email",
  conditionId: "Condition",
  statusId: "Status",
  vendorId: "Vendor",
  purchaseDate: "Purchase date",
  purchaseCost: "Purchase cost",
  warrantyExpiry: "Warranty expiry",
  depreciationMethod: "Depreciation method",
  usefulLifeMonths: "Useful life",
  salvageValue: "Salvage value",
  notes: "Notes",
};

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
  accessoryCatalog,
  accessories = NO_ACCESSORIES,
}: {
  mode: "create" | "edit";
  asset?: AssetWithRelations;
  categories: Category[];
  locations: Location[];
  departments: Department[];
  vendors: Vendor[];
  conditions: AssetCondition[];
  statuses: AssetStatus[];
  /** Active catalog entries for the picker (Settings > Accessories). */
  accessoryCatalog: Accessory[];
  /** The asset's current accessories (edit mode). */
  accessories?: AssetAccessory[];
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
  const [accessoryRows, setAccessoryRows] = React.useState<AccessoryRow[]>(() =>
    rowsFromAccessories(accessories),
  );
  const accessoryChoices = React.useMemo(
    () => accessoryOptions(accessoryCatalog, accessories),
    [accessoryCatalog, accessories],
  );
  // Checked against the status being saved, same as the server (lib/db/assetAccessories.ts).
  const selectedStatusName =
    statuses.find((s) => s.id === form.statusId)?.name ?? null;
  const accessoriesLocked =
    selectedStatusName != null && !canEditAccessories(selectedStatusName);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(
    asset?.imagePath
      ? `/api/assets/${asset.id}/image?v=${encodeURIComponent(asset.imagePath)}`
      : null,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fields = useFieldErrors<AssetField>();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  // An existing image whose preview the user cleared with "Remove" (and didn't replace).
  const removingImage = !!asset?.imagePath && !imagePreview && !imageFile;

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
    fields.clear(key as AssetField);
  }

  // Per docs/asset-lifecycle-flow.md: default status is in_storage, unless an owner is set at
  // creation time, in which case active. Only auto-applies until the user picks a status
  // themselves, and only on create, editing an existing asset never silently changes status.
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
    fields.clear("assignedUserId");
    fields.clear("ownerName");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    fields.clear("image");
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    fields.clear("image");
    // Reset the picker too, or choosing the same file again wouldn't fire onChange.
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function confirmOptions() {
    if (mode === "create") {
      const owner =
        form.ownerMode === "user" ? form.assignedUserName : form.ownerName;
      const status = statuses.find((s) => s.id === form.statusId);
      return {
        title: "Create asset?",
        description: (
          <ConfirmSummary
            intro="This adds the asset to the register."
            rows={[
              ["Asset tag", form.assetTag.trim()],
              ["Name", form.name.trim()],
              [
                "Category",
                categories.find((c) => c.id === form.categoryId)?.name,
              ],
              ["Status", status && formatLookupName(status.name)],
              [
                "Location",
                locations.find((l) => l.id === form.locationId)?.name,
              ],
              [
                "Department",
                departments.find((d) => d.id === form.departmentId)?.name,
              ],
              ["Owner", owner?.trim()],
            ]}
          />
        ),
        confirmLabel: "Create asset",
      };
    }
    const changed = changedFields();
    return {
      title: "Save changes?",
      description: (
        <ConfirmSummary
          intro={
            <>
              Updating <strong>{form.assetTag.trim()}</strong>:
            </>
          }
          rows={[["Changed", [...changed].join(", ")]]}
        />
      ),
      confirmLabel: "Save changes",
    };
  }

  /** Labels of the fields an edit would change, empty when saving would be a no-op. */
  function changedFields(): Set<string> {
    const initial = initialState(asset, defaultStatusId);
    const changed = new Set(
      (Object.keys(FIELD_LABELS) as (keyof FormState)[])
        .filter((key) => form[key] !== initial[key])
        .map((key) => FIELD_LABELS[key]!),
    );
    if (imageFile || removingImage) changed.add("Image");
    // Row keys are regenerated per call, so compare only what gets saved.
    const rowValues = (rows: AccessoryRow[]) =>
      JSON.stringify(rows.map((r) => [r.accessoryId, r.quantity, r.notes]));
    if (
      !accessoriesLocked &&
      rowValues(accessoryRows) !== rowValues(rowsFromAccessories(accessories))
    )
      changed.add("Accessories");
    return changed;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const external = form.ownerMode === "external";
    const life = form.usefulLifeMonths.trim();
    const ok = fields.validate(
      {
        assetTag: !form.assetTag.trim() && "Enter an asset tag.",
        name: !form.name.trim() && "Enter a name.",
        categoryId: form.categoryId == null && "Select a category.",
        locationId: form.locationId == null && "Select a location.",
        departmentId: form.departmentId == null && "Select a department.",
        assignedUserId:
          !external &&
          !form.assignedUserId &&
          "Select the user who owns this asset, or switch to External.",
        ownerName:
          external && !form.ownerName.trim() && "Enter the owner's name.",
        ownerEmail:
          external &&
          form.ownerEmail.trim() !== "" &&
          !looksLikeEmail(form.ownerEmail) &&
          "Enter a valid email address, or leave it blank.",
        conditionId: form.conditionId == null && "Select a condition.",
        statusId: form.statusId == null && "Select a status.",
        purchaseCost: notNonNegative(form.purchaseCost) && NON_NEGATIVE,
        usefulLifeMonths:
          life !== "" &&
          !(Number.isInteger(Number(life)) && Number(life) > 0) &&
          "Enter a whole number of months greater than 0, or leave it blank.",
        salvageValue: notNonNegative(form.salvageValue) && NON_NEGATIVE,
        image:
          !!imageFile &&
          imageFile.size > MAX_IMAGE_BYTES &&
          "The image must be 5 MB or smaller.",
      },
      e.currentTarget,
    );
    if (!ok) return;
    // A locked status leaves the asset's accessories untouched (the field isn't sent at all).
    const accessoryResult = accessoriesLocked
      ? null
      : accessoriesPayload(accessoryRows);
    if (accessoryResult && "error" in accessoryResult) {
      setError(accessoryResult.error);
      return;
    }
    if (mode === "edit" && asset && changedFields().size === 0) {
      router.push(`/assets/${asset.id}`, undefined, () =>
        addToast({ title: "No changes to save", variant: "info" }),
      );
      return;
    }
    if (!(await confirm(confirmOptions()))) return;
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
    if (accessoryResult) {
      formData.set("accessories", JSON.stringify(accessoryResult.items));
    }
    if (imageFile) formData.set("image", imageFile);
    else if (removingImage) formData.set("removeImage", "1");

    try {
      if (mode === "create") {
        const res = await axios.post<{ asset: { id: string } }>(
          "/api/assets",
          formData,
        );
        router.push(`/assets/${res.data.asset.id}`, undefined, () =>
          addToast({ title: "Asset created", variant: "success" }),
        );
      } else if (asset) {
        await axios.patch(`/api/assets/${asset.id}`, formData);
        router.push(`/assets/${asset.id}`, undefined, () =>
          addToast({ title: "Asset updated", variant: "success" }),
        );
      }
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <Section title="Basic information">
        <Field
          label="Asset tag"
          htmlFor="asset-tag"
          required
          error={fields.errors.assetTag}
          errorId={fields.errorId("assetTag")}
        >
          <Input
            id="asset-tag"
            required
            {...fields.invalid("assetTag")}
            value={form.assetTag}
            onChange={(e) => update("assetTag", e.target.value)}
          />
        </Field>
        <Field
          label="Name"
          htmlFor="asset-name"
          required
          error={fields.errors.name}
          errorId={fields.errorId("name")}
        >
          <Input
            id="asset-name"
            required
            {...fields.invalid("name")}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>
        <Field
          label="Category"
          htmlFor="asset-category"
          required
          error={fields.errors.categoryId}
          errorId={fields.errorId("categoryId")}
        >
          <TreePicker
            id="asset-category"
            {...fields.invalid("categoryId")}
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
        <Field
          label="Location"
          htmlFor="asset-location"
          required
          error={fields.errors.locationId}
          errorId={fields.errorId("locationId")}
        >
          <TreePicker
            id="asset-location"
            {...fields.invalid("locationId")}
            items={locationItems}
            value={form.locationId}
            onChange={(v) => update("locationId", v)}
            placeholder="Select a location"
          />
        </Field>
        <Field
          label="Department"
          htmlFor="asset-department"
          required
          error={fields.errors.departmentId}
          errorId={fields.errorId("departmentId")}
        >
          <Select
            id="asset-department"
            required
            {...fields.invalid("departmentId")}
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
          <span className="text-sm font-medium">
            Owner
            <RequiredMark />
          </span>
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
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <UserTypeahead
              value={form.assignedUserId}
              displayName={form.assignedUserName}
              onSelect={(u) =>
                updateOwner({
                  assignedUserId: u?.id ?? null,
                  assignedUserName: u?.fullName ?? null,
                })
              }
              aria-label="Owner (system user)"
              {...fields.invalid("assignedUserId")}
            />
            <FieldError
              id={fields.errorId("assignedUserId")}
              message={fields.errors.assignedUserId}
            />
          </div>
        ) : (
          <>
            <Field
              label="Owner name"
              htmlFor="asset-owner-name"
              required
              error={fields.errors.ownerName}
              errorId={fields.errorId("ownerName")}
            >
              <Input
                id="asset-owner-name"
                {...fields.invalid("ownerName")}
                required={form.ownerMode === "external"}
                value={form.ownerName}
                onChange={(e) => updateOwner({ ownerName: e.target.value })}
              />
            </Field>
            <Field
              label="Owner email"
              htmlFor="asset-owner-email"
              error={fields.errors.ownerEmail}
              errorId={fields.errorId("ownerEmail")}
            >
              <Input
                id="asset-owner-email"
                {...fields.invalid("ownerEmail")}
                type="email"
                value={form.ownerEmail}
                onChange={(e) => update("ownerEmail", e.target.value)}
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Condition & status">
        <Field
          label="Condition"
          htmlFor="asset-condition"
          required
          error={fields.errors.conditionId}
          errorId={fields.errorId("conditionId")}
        >
          <Select
            id="asset-condition"
            required
            {...fields.invalid("conditionId")}
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
        <Field
          label="Status"
          htmlFor="asset-status"
          required
          error={fields.errors.statusId}
          errorId={fields.errorId("statusId")}
        >
          <Select
            id="asset-status"
            required
            {...fields.invalid("statusId")}
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
            {/* Disposal goes through the disposal flow (it needs an asset_disposals record) */}
            {statuses
              .filter((s) => s.name !== "disposed")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.replace(/_/g, " ")}
                </option>
              ))}
          </Select>
        </Field>
      </Section>

      <Section title="Accessories">
        <div className="flex flex-col gap-2 sm:col-span-2">
          {accessoriesLocked && (
            <p className="text-muted-foreground text-sm">
              Accessories can&apos;t be changed while the asset is{" "}
              {formatLookupName(selectedStatusName ?? "")}. Changes here
              won&apos;t be saved.
            </p>
          )}
          <AccessoriesEditor
            idPrefix="asset-accessories"
            rows={accessoryRows}
            onChange={setAccessoryRows}
            options={accessoryChoices}
            disabled={accessoriesLocked}
          />
        </div>
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
          <DatePicker
            id="asset-purchase-date"
            value={form.purchaseDate}
            onChange={(v) => update("purchaseDate", v)}
            placeholder="No date"
          />
        </Field>
        <Field
          label="Purchase cost (KES)"
          htmlFor="asset-purchase-cost"
          error={fields.errors.purchaseCost}
          errorId={fields.errorId("purchaseCost")}
        >
          <Input
            id="asset-purchase-cost"
            {...fields.invalid("purchaseCost")}
            type="number"
            step="0.01"
            min="0"
            value={form.purchaseCost}
            onChange={(e) => update("purchaseCost", e.target.value)}
          />
        </Field>
        <Field label="Warranty expiry" htmlFor="asset-warranty-expiry">
          <DatePicker
            id="asset-warranty-expiry"
            value={form.warrantyExpiry}
            onChange={(v) => update("warrantyExpiry", v)}
            placeholder="No date"
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
          </Select>
        </Field>
        <Field
          label="Useful life (months)"
          htmlFor="asset-useful-life"
          error={fields.errors.usefulLifeMonths}
          errorId={fields.errorId("usefulLifeMonths")}
        >
          <PresetInput
            id="asset-useful-life"
            controlProps={fields.invalid("usefulLifeMonths")}
            presets={USEFUL_LIFE_PRESETS}
            inputProps={{ min: "1", step: "1", placeholder: "Months" }}
            value={form.usefulLifeMonths}
            onChange={(value) => update("usefulLifeMonths", value)}
          />
        </Field>
        <Field
          label="Salvage value (KES)"
          htmlFor="asset-salvage-value"
          error={fields.errors.salvageValue}
          errorId={fields.errorId("salvageValue")}
        >
          <PresetInput
            id="asset-salvage-value"
            controlProps={fields.invalid("salvageValue")}
            presets={SALVAGE_VALUE_PRESETS}
            inputProps={{ min: "0", step: "0.01", placeholder: "Amount" }}
            value={form.salvageValue}
            onChange={(value) => update("salvageValue", value)}
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
                ref={imageInputRef}
                id="asset-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                {...fields.invalid("image")}
              />
              <FieldError
                id={fields.errorId("image")}
                message={fields.errors.image}
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
        <Button type="submit" loading={submitting}>
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create asset"
              : "Save changes"}
        </Button>
      </div>
      {confirmDialog}
    </form>
  );
}
