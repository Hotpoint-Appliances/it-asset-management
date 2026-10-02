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

## Preamble: Phase 5 re-verification

Before starting, `phase-5-asset-lifecycle` was re-verified independently; its defects (D1-D6) and
the depreciation-type narrowing were fixed first. See that skill's "Re-verified before Phase 6"
section. The same pass introduced the shared `DatePicker` used by the reports page.

## Decisions made (confirmed with the user before building)

- **Dashboard lives at `/`** (`app/(dashboard)/(overview)/page.tsx`), not `/dashboard`: the sidebar's
  Dashboard item already points at `/`, so no nav change and no redirect. (The original Produces
  line said `/dashboard`; superseded.)
- **No charting dependency**: bars are hand-rolled CSS (`BarBreakdown`), stat tiles and lists
  otherwise. Every bar prints its exact count and links into the pre-filtered assets list.
- **Warranty window**: `system_settings` key `warranty_expiry_windows_days` (comma-separated,
  e.g. `30,60,90`, max 3 values, each 1-365); missing/invalid falls back to 30/60/90. No admin
  settings UI (out of scope); set via SQL until one exists.
- **Report access is role-tiered**: asset register + audit trail for every role (viewer rows
  limited to their department in SQL); disposal register + depreciation summary admin +
  asset_manager only (403 for viewers, card hidden on `/reports`).
- **Depreciation is straight-line only**, and the asset form/API now only accept
  `straight_line` or none. Assets missing purchase date, cost or useful life are listed with a
  note and "n/a" values rather than a misleading zero; disposed assets are excluded.
- **Disposed vs soft-deleted**: soft-deleted assets appear nowhere. Fleet summary counts by
  status *include* a `disposed` bucket; every other widget, and the by-category/by-department
  breakdowns, exclude disposed assets. The asset register export includes disposed rows (Status
  column shows it; filter to exclude).

## Confirmed as built

- **Dashboard** (`app/(dashboard)/(overview)/page.tsx`, `components/dashboard/*`, `lib/db/dashboard.ts`):
  stat tiles (total / in service / in repair / warranty ending within the first window), status,
  category and department bar breakdowns, warranty-expiring list with a 30/60/90 toggle, assets
  in repair (`asset_maintenance.status = 'in_progress'`), and the latest audit activity. Every
  query takes the requester and applies viewer department scoping in SQL.
- **Reports** (`app/api/reports/*`, `lib/reports/*`, `lib/db/reports.ts`): four `exceljs`
  workbooks with a title/scope line, styled + frozen + filterable header, real Excel dates and
  KES-formatted numbers. Serialized in memory (`writeBuffer`) and returned as an attachment, DB
  access stays server-only; the datasets are small enough that piping a stream added complexity for
  no gain. Exports return the *full* matching dataset (no pagination). All lookups are resolved to
  names in SQL, including the audit trail's old/new values (`assigned_user_id`, `status_id`, ...).
- **Entry points**: `/reports` hub (audit trail card has From/To `DatePicker`s), an **Export**
  button on the Assets list that forwards its current filters/search to the register export
  (whole filtered set, all pages), and an **Export audit trail** button on an asset's Audit Log
  tab (`?assetId=`; a viewer asking for an asset outside their department gets a 404, not an empty
  file).
- **`lib/reports/depreciation.ts`**: pure `computeStraightLine(asset, asOf)`, whole calendar
  months (`wholeMonthsBetween`, string-based so no timezone shift), capped at useful life, book
  value floored at salvage.
- **`scripts/seed-demo.ts`** (`npm run seed:demo`): 14 `DEMO-*` assets across departments and
  statuses with two in-progress repairs, a completed and a scheduled maintenance record,
  disposals (one sold, one scrapped), warranties spread across the 30/60/90 windows (plus one
  expired, one missing), an owner change to a system user, and depreciation edge cases (missing
  inputs, none). Re-runnable; only ever deletes `DEMO-*` tags.

## Verified

- `tsc --noEmit` and `npm run lint` clean (only the two pre-existing Phase 4 `AssetQrCode`
  warnings).
- Real query + workbook code run against the live DB via a scratch script (not committed): fleet
  overview, warranty, repairs, activity and all four workbooks generated, written to `.xlsx`,
  read back with `exceljs`. Confirmed: admin sees 16 assets, the Operations viewer sees 4
  (register and dashboard agree); search filter narrows the register; a future date range yields
  a valid empty audit workbook; depreciation for DEMO-001 (13 months, 46,944.44 accumulated,
  98,055.56 book) and DEMO-002 (20,000 / 112,000) match hand calculation; the disposal register
  shows both disposals; no raw ids anywhere; the timeline shows the assigned user's name (D1).
- Unauthenticated HTTP against the running dev server: all four report routes and the disposal
  attachment route return 401; `/reports` and `/` redirect to `/login`.
- **Browser verification, completed as Phase 7's preamble** (originally left pending here because
  Claude in Chrome was unavailable): admin `/` in the user's Chrome session (dashboard renders,
  30/60/90 toggle works, no console errors), plus headless Playwright with temporary admin and
  Operations-viewer users (18 checks, zero console/page errors). Viewer: asset register and audit
  trail 200, disposal register and depreciation **403**, `/reports` hides both cards, dashboard
  renders scoped. Admin: dashboard renders; all four `/api/reports/*` return real `.xlsx`
  (zip magic, correct content-type); the `DatePicker` inside the Disposal `Dialog` opens, supports
  keyboard selection, Escape closes only the calendar and a second Escape closes the Dialog; the
  audit-trail card's From/To pickers support keyboard selection; the Assets list **Export**
  downloads `asset-register-<date>.xlsx`. 390px: no horizontal scroll on `/`, `/reports` or asset
  detail. No defects found.

## Exit criteria

- Dashboard loads with real data from the seeded/test dataset, correctly scoped per role
  (data layer and page rendering both verified, see above).
- Each report exports a valid `.xlsx` file openable in Excel with correctly resolved lookup
  names (no raw foreign key ids in the output), verified by reading the generated files back.
- Viewer access to the disposal register / depreciation summary is 403 (route-level
  `requireApiRole`; verified live with an authenticated viewer session).

## Produces (for later phases to reference)

- `app/(dashboard)/(overview)/page.tsx` (dashboard), `app/(dashboard)/reports/page.tsx`
- `app/api/reports/{asset-register,audit-trail,disposal-register,depreciation}/route.ts`
- `lib/reports/{reports,workbook,depreciation,params}.ts` (one builder per report, shared exceljs
  helpers, pure straight-line formula, query-string parsing)
- `lib/db/{dashboard,reports,systemSettings}.ts`; `listWarrantyExpiring()` is reused by Phase 7's
  `runWarrantyExpiringCheck()` (with an unscoped requester and a high limit)
- `types/dashboard.ts`; `components/dashboard/*`, `components/reports/*`
- `components/ui/DatePicker.tsx`, `scripts/seed-demo.ts`, `npm run seed:demo`

## Related skills

- `skills/phase-5-asset-lifecycle` — source of the audit/disposal/maintenance data reported on
- `skills/phase-7-notifications` — warranty-expiring logic here is reused as a notification trigger
