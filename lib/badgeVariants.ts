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
};

const CONDITION_VARIANTS: Record<string, BadgeVariant> = {
  good: "success",
  bad: "warning",
  worse: "danger",
};

export function statusBadgeVariant(name: string): BadgeVariant {
  return STATUS_VARIANTS[name] ?? "outline";
}

export function conditionBadgeVariant(name: string): BadgeVariant {
  return CONDITION_VARIANTS[name] ?? "outline";
}

export function formatLookupName(name: string): string {
  return name.replace(/_/g, " ");
}
