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
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function TreePicker<T extends WithParent>({
  items,
  value,
  onChange,
  excludeId,
  placeholder = "None (top level)",
  id,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: TreePickerProps<T>) {
  const excluded =
    excludeId != null
      ? collectDescendantIds(items, excludeId)
      : new Set<number>();
  if (excludeId != null) excluded.add(excludeId);
  const selectable = items.filter((item) => !excluded.has(item.id));
  const flat = flattenForSelect(buildTree(selectable));
  /** Full "Ancestor › … › Item" path per option, matched and shown by Select's search so
   * same-named nodes under different parents stay distinguishable once the tree is filtered. */
  const ancestors: string[] = [];
  const paths = flat.map(({ item, depth }) => {
    ancestors.length = depth;
    ancestors.push(item.name);
    return ancestors.join(" › ");
  });

  return (
    <Select
      id={id}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{placeholder}</option>
      {flat.map(({ item, depth }, i) => (
        <option key={item.id} value={item.id} data-search-label={paths[i]}>
          {depth > 0 ? "  ".repeat(depth) + "└ " : ""}
          {item.name}
        </option>
      ))}
    </Select>
  );
}
