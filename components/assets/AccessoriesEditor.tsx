"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MAX_ACCESSORY_QUANTITY } from "@/lib/assetAccessories";
import type {
  Accessory,
  AssetAccessory,
  AssetAccessoryInput,
} from "@/types/accessory";

/** One editable row. Quantity is kept as typed (a string) so a half-edited value isn't coerced. */
export interface AccessoryRow {
  key: string;
  accessoryId: number | null;
  quantity: string;
  notes: string;
}

export interface AccessoryOption {
  id: number;
  name: string;
  isActive: boolean;
}

let rowSeq = 0;
const nextKey = () => `accessory-row-${++rowSeq}`;

export function rowsFromAccessories(
  attached: AssetAccessory[],
): AccessoryRow[] {
  return attached.map((a) => ({
    key: nextKey(),
    accessoryId: a.accessoryId,
    quantity: String(a.quantity),
    notes: a.notes ?? "",
  }));
}

/** Pickers offer the active catalog plus any retired accessory already attached, so an existing
 * row still shows its name and can keep it (the server only rejects *newly* added retired ones). */
export function accessoryOptions(
  catalog: Accessory[],
  attached: AssetAccessory[],
): AccessoryOption[] {
  const options: AccessoryOption[] = catalog.filter((a) => a.isActive);
  for (const a of attached) {
    if (!options.some((o) => o.id === a.accessoryId)) {
      options.push({ id: a.accessoryId, name: a.name, isActive: a.isActive });
    }
  }
  return options;
}

/** Client-side check mirroring lib/validation/accessories.ts, returning the payload or the first
 * problem to show. */
export function accessoriesPayload(
  rows: AccessoryRow[],
): { items: AssetAccessoryInput[] } | { error: string } {
  const items: AssetAccessoryInput[] = [];
  for (const row of rows) {
    if (row.accessoryId == null) {
      return { error: "Select an accessory for every row, or remove it." };
    }
    const quantity = Number(row.quantity);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ACCESSORY_QUANTITY
    ) {
      return {
        error: `Accessory quantities must be whole numbers from 1 to ${MAX_ACCESSORY_QUANTITY}.`,
      };
    }
    items.push({
      accessoryId: row.accessoryId,
      quantity,
      notes: row.notes.trim() || null,
    });
  }
  return { items };
}

/** Accessory list editor shared by the asset form's Accessories section and the detail page's
 * "Edit accessories" dialog. Controlled: the parent owns `rows`. */
export function AccessoriesEditor({
  rows,
  onChange,
  options,
  disabled,
  idPrefix,
}: {
  rows: AccessoryRow[];
  onChange: (rows: AccessoryRow[]) => void;
  options: AccessoryOption[];
  disabled?: boolean;
  idPrefix: string;
}) {
  const selectedIds = new Set(rows.map((r) => r.accessoryId));
  const canAdd = options.some((o) => o.isActive && !selectedIds.has(o.id));

  function updateRow(key: string, patch: Partial<AccessoryRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([
      ...rows,
      { key: nextKey(), accessoryId: null, quantity: "1", notes: "" },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No accessories attached.
        </p>
      )}
      {rows.map((row, index) => {
        const label = `Accessory ${index + 1}`;
        return (
          <div
            key={row.key}
            className="border-border flex flex-wrap items-center gap-2 rounded-lg border p-2 sm:flex-nowrap sm:border-0 sm:p-0"
          >
            <div className="min-w-0 basis-full sm:shrink-0 sm:basis-56">
              <Select
                id={`${idPrefix}-${index}-accessory`}
                aria-label={label}
                disabled={disabled}
                value={row.accessoryId ?? ""}
                onChange={(e) =>
                  updateRow(row.key, {
                    accessoryId: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="" disabled>
                  Select an accessory
                </option>
                {options
                  .filter(
                    (o) =>
                      o.id === row.accessoryId ||
                      (o.isActive && !selectedIds.has(o.id)),
                  )
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.isActive ? o.name : `${o.name} (retired)`}
                    </option>
                  ))}
              </Select>
            </div>
            <Input
              id={`${idPrefix}-${index}-quantity`}
              aria-label={`${label} quantity`}
              type="number"
              min={1}
              max={MAX_ACCESSORY_QUANTITY}
              step={1}
              disabled={disabled}
              value={row.quantity}
              onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
              className="w-20 shrink-0"
            />
            <Input
              id={`${idPrefix}-${index}-notes`}
              aria-label={`${label} notes`}
              placeholder="Notes (optional)"
              disabled={disabled}
              value={row.notes}
              onChange={(e) => updateRow(row.key, { notes: e.target.value })}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Remove {label.toLowerCase()}</span>
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !canAdd}
        onClick={addRow}
        className="w-fit"
      >
        <Plus className="h-4 w-4" />
        Add accessory
      </Button>
    </div>
  );
}
