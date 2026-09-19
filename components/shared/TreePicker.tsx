"use client";

import {
  buildTree,
  collectDescendantIds,
  flattenForSelect,
  type WithParent,
} from "@/lib/tree";
import { Select } from "@/components/ui/Select";

interface TreePickerProps<T extends WithParent> {
  items: T[];
  value: number | null;
  onChange: (value: number | null) => void;
  /** When editing an existing node, exclude it and its descendants so it can't become its own
   * ancestor. Omit when creating a new node. */
  excludeId?: number | null;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

export function TreePicker<T extends WithParent>({
  items,
  value,
  onChange,
  excludeId,
  placeholder = "None (top level)",
  id,
  disabled,
}: TreePickerProps<T>) {
  const excluded =
    excludeId != null
      ? collectDescendantIds(items, excludeId)
      : new Set<number>();
  if (excludeId != null) excluded.add(excludeId);
  const selectable = items.filter((item) => !excluded.has(item.id));
  const flat = flattenForSelect(buildTree(selectable));

  return (
    <Select
      id={id}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{placeholder}</option>
      {flat.map(({ item, depth }) => (
        <option key={item.id} value={item.id}>
          {"— ".repeat(depth)}
          {item.name}
        </option>
      ))}
    </Select>
  );
}
