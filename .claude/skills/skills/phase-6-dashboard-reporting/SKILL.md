---
name: phase-6-dashboard-reporting
description: Phase 6 — dashboard widgets and exceljs data exports. Depends on phase-5-asset-lifecycle.
---

# Phase 6 — Dashboard & Reporting

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].
Depends on `phase-5-asset-lifecycle` (needs audit log, maintenance, disposal data to report on).

Before starting the Steps below, run [[phase-completion-check]] against
`phase-5-asset-lifecycle`'s exit criteria.

## Objective

A dashboard landing page giving an at-a-glance fleet overview, plus exportable reports
(`exceljs`) for offline/finance/audit use.

## Dashboard widgets

- **Fleet summary** — total assets, counts by status (active/in_repair/disposed/etc.) as a
  chart or stat tiles.
- **By category / by department** — breakdown charts.
- **Warranty expiring soon** — assets with `warranty_expiry` within the next 30/60/90 days
  (configurable via `system_settings`), list with quick links.
- **Recent activity** — latest N rows from `asset_audit_log` across all assets (admin/asset_
  manager view; viewers see only their department's activity).
- **Assets in repair** — quick list of `asset_maintenance` rows with status `in_progress`.

Scope widgets to the viewing user's role/department using the same query-layer pattern
established in Phase 2/4 (never filter only in the UI).

## Reports (exceljs exports)

- **Full asset register** — all asset fields + resolved lookup names (category, location,
  department, condition, status, owner), respecting current list-page filters if exported from
  there.
- **Audit trail export** — `asset_audit_log` rows for a date range or specific asset.
- **Disposal register** — `asset_disposals` joined with asset details, for finance/audit.
- **Depreciation summary** — compute current book value per asset using the **straight-line
  method only** for MVP (confirmed scope decision): `(purchase_cost − salvage_value) /
  useful_life_months × months_elapsed`, floored at `salvage_value`. This is a stateless
  per-row formula (no stored schedule table needed). Declining-balance depreciation is
  explicitly **out of scope** for MVP — it requires a chosen rate policy and period-by-period
  iteration; revisit only if requested later, as a reporting-layer addition with no schema
  change required.

Implement exports as a server route handler streaming an `exceljs` workbook
(`Content-Disposition: attachment`), not client-side generation — keeps DB access server-only
per [[itam-conventions]].

## Exit criteria

- Dashboard loads with real data from the seeded/test dataset, correctly scoped per role.
- Each report exports a valid `.xlsx` file openable in Excel with correctly resolved lookup
  names (no raw foreign key ids in the output).

## Produces (for later phases to reference)

- `/app/(dashboard)/dashboard/page.tsx`, `/app/(dashboard)/reports/*`
- `/api/reports/*` export route handlers
- `lib/reports/*.ts` (workbook-building helpers, one per report type)

## Related skills

- `skills/phase-5-asset-lifecycle` — source of the audit/disposal/maintenance data reported on
- `skills/phase-7-notifications` — warranty-expiring logic here is reused as a notification trigger
