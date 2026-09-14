import { History } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatLookupName } from "@/lib/badgeVariants";
import type { AssetAuditLogEntry } from "@/types/auditLog";
import type { Location } from "@/types/location";
import type { Department } from "@/types/department";
import type { AssetCondition } from "@/types/assetCondition";
import type { AssetStatus } from "@/types/assetStatus";

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  location_change: "Location changed",
  department_change: "Department changed",
  owner_change: "Owner changed",
  condition_change: "Condition changed",
  status_change: "Status changed",
  disposed: "Disposed",
  deleted: "Deleted",
};

/** Which lookup table (if any) a tracked field's old_value/new_value is an id into — resolved
 * against the id->name maps built below so the timeline shows "Warehouse A", not "5". */
const LOOKUP_BY_FIELD: Record<string, keyof AuditLookups> = {
  location_id: "locations",
  department_id: "departments",
  condition_id: "conditions",
  status_id: "statuses",
};

interface AuditLookups {
  locations: Record<number, string>;
  departments: Record<number, string>;
  conditions: Record<number, string>;
  statuses: Record<number, string>;
}

function toMap(items: { id: number; name: string }[]): Record<number, string> {
  return Object.fromEntries(items.map((i) => [i.id, i.name]));
}

function formatValue(
  fieldName: string | null,
  value: string | null,
  lookups: AuditLookups,
): string {
  if (value == null) return "—";
  const lookupKey = fieldName ? LOOKUP_BY_FIELD[fieldName] : undefined;
  if (lookupKey) {
    const id = Number(value);
    const name = lookups[lookupKey][id];
    if (name) return formatLookupName(name);
  }
  return value;
}

function describe(entry: AssetAuditLogEntry, lookups: AuditLookups): string {
  const label =
    ACTION_LABELS[entry.actionType] ?? formatLookupName(entry.actionType);
  if (!entry.fieldName) return label;
  const field = entry.fieldName.replace(/_id$/, "").replace(/_/g, " ");
  const oldValue = formatValue(entry.fieldName, entry.oldValue, lookups);
  const newValue = formatValue(entry.fieldName, entry.newValue, lookups);
  return `${label} — ${field}: ${oldValue} → ${newValue}`;
}

/** Audit Log tab (phase-5-asset-lifecycle Step 6) — the payoff of the unified audit log design
 * (itam-schema-reference point 1): one query (lib/db/auditLog.ts's listAuditLogForAsset), one
 * component, covers every action type recorded by phase-4 and this phase alike. Takes the same
 * lookup lists already fetched for the lifecycle dialogs (see app/(dashboard)/assets/[id]/
 * page.tsx) so id-backed old/new values render as names, not raw foreign keys. */
export function AuditLogTimeline({
  entries,
  locations,
  departments,
  conditions,
  statuses,
}: {
  entries: AssetAuditLogEntry[];
  locations: Location[];
  departments: Department[];
  conditions: AssetCondition[];
  statuses: AssetStatus[];
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No history yet"
        description="Actions on this asset will appear here."
      />
    );
  }

  const lookups: AuditLookups = {
    locations: toMap(locations),
    departments: toMap(departments),
    conditions: toMap(conditions),
    statuses: toMap(statuses),
  };

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="border-border flex flex-col gap-1 rounded-lg border p-3 text-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{describe(entry, lookups)}</span>
            <span className="text-muted-foreground text-xs">
              {new Date(entry.performedAt).toLocaleString()}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">
            by {entry.performedByName}
          </span>
          {entry.note && <p className="text-sm">{entry.note}</p>}
        </li>
      ))}
    </ol>
  );
}
