import type { BadgeProps } from "@/components/ui/Badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/** Shared status/condition -> Badge variant map, per itam-design-system's "define once, not
 * per-component" rule. Keyed by the seeded lookup-table names; an admin-added name not in this
 * map (conditions/statuses are admin-editable, per itam-schema-reference) falls back to
 * "outline" rather than breaking. */
const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: "success",
  in_storage: "neutral",
  reserved: "outline",
  in_repair: "warning",
  lost: "danger",
  stolen: "danger",
  disposed: "neutral",
  awaiting_disposal: "neutral",
  faulty: "warning",
  beyond_repair: "danger",
};

const CONDITION_VARIANTS: Record<string, BadgeVariant> = {
  good: "success",
  fair: "neutral",
  bad: "warning",
  worse: "danger",
};

/** Settings stores names as typed, so "awaiting disposal" and "awaiting_disposal" both reach here. */
export function statusKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "_");
}

export function statusBadgeVariant(name: string): BadgeVariant {
  return STATUS_VARIANTS[statusKey(name)] ?? "outline";
}

export function conditionBadgeVariant(name: string): BadgeVariant {
  return CONDITION_VARIANTS[name] ?? "outline";
}

export function formatLookupName(name: string): string {
  return name.replace(/_/g, " ");
}
