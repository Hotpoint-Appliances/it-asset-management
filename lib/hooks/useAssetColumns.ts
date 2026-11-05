"use client";

import * as React from "react";

/** The assets table's optional columns, in display order. Tag, Name and Actions are always shown:
 * a row needs its identity and its link, and the row menu is the only route to its actions. */
export const ASSET_COLUMNS = [
  { key: "serial", label: "Serial number", defaultVisible: false },
  { key: "category", label: "Category", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "condition", label: "Condition", defaultVisible: true },
  { key: "location", label: "Location", defaultVisible: true },
  { key: "department", label: "Department", defaultVisible: true },
  { key: "owner", label: "Owner", defaultVisible: true },
  { key: "email", label: "Owner email", defaultVisible: false },
] as const;

export type AssetColumnKey = (typeof ASSET_COLUMNS)[number]["key"];

/** Only the columns changed from their default, so a column added later still gets its own
 * default for people who already saved a choice. */
type ColumnOverrides = Partial<Record<AssetColumnKey, boolean>>;

const STORAGE_KEY = "assets-list-columns";
const EMPTY = "{}";

// A `storage` event only reaches other tabs, so this tab's subscribers are told directly.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The raw string is the snapshot because it compares by value, so reading it never triggers a
 * re-render by itself. Storage can throw in a private window or with site data blocked. */
function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

function getServerSnapshot(): string {
  return EMPTY;
}

function parseOverrides(raw: string): ColumnOverrides {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as ColumnOverrides)
      : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides: ColumnOverrides) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Unavailable storage just means the choice doesn't persist.
  }
  listeners.forEach((listener) => listener());
}

/** Which optional columns the assets table shows, saved per browser. The server renders the
 * defaults and the saved choice applies during hydration, so the two never disagree. */
export function useAssetColumns() {
  const raw = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const overrides = React.useMemo(() => parseOverrides(raw), [raw]);

  const isVisible = React.useCallback(
    (key: AssetColumnKey) => {
      const override = overrides[key];
      if (typeof override === "boolean") return override;
      return ASSET_COLUMNS.find((c) => c.key === key)?.defaultVisible ?? true;
    },
    [overrides],
  );

  const setVisible = React.useCallback(
    (key: AssetColumnKey, visible: boolean) => {
      const column = ASSET_COLUMNS.find((c) => c.key === key);
      const next = { ...overrides };
      if (column?.defaultVisible === visible) delete next[key];
      else next[key] = visible;
      writeOverrides(next);
    },
    [overrides],
  );

  const reset = React.useCallback(() => writeOverrides({}), []);

  const isDefault = ASSET_COLUMNS.every(
    (column) => isVisible(column.key) === column.defaultVisible,
  );

  return { isVisible, setVisible, reset, isDefault };
}
