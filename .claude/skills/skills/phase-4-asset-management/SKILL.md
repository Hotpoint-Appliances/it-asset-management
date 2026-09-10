---
name: phase-4-asset-management
description: Phase 4 — core asset CRUD, image/file upload to disk, and QR code label generation. Depends on phase-3-core-data.
---

# Phase 4 — Asset Management

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].
Depends on `phase-3-core-data` (all dropdown/lookup data must already be manageable).

Before starting the Steps below, run [[phase-completion-check]] against `phase-3-core-data`'s
exit criteria.

## Objective

Full CRUD for the `assets` table itself: list, filter, search, create, edit, view detail, plus
image upload and printable QR/barcode labels.

## Steps

1. **Asset list page** — data table per [[itam-design-system]]: columns for tag, name,
   category, status badge, condition badge, location, department, owner. Filter bar (status,
   category, department, location, condition — multi-select), search by tag/name/serial,
   pagination. `viewer` role sees only their own department (enforced at the query layer,
   consistent with Phase 2).
2. **Asset create/edit form** — full page (not modal, per [[itam-design-system]] guidance on
   form size). Fields per `schema/schema.sql`: required (asset_tag, name, category, location,
   department, condition, status) and optional (model_number, serial_number, image,
   assigned_user_id/owner_name/owner_email, vendor, purchase_date, purchase_cost,
   warranty_expiry, depreciation fields, notes). Use the `<TreePicker>` from Phase 3 for
   category/location, and a type-ahead search over `users` for `assigned_user_id` with
   free-text fallback per [[itam-schema-reference]] ownership rules.
3. **Image upload** — write to `ASSET_FILES_BASE_PATH` (env var from Phase 1) under e.g.
   `assets/{asset_id}/{filename}`; store only the relative path in `assets.image_path`.
   Validate file type/size server-side before writing to disk. Serve images via a route handler
   that reads from the base path (do not expose the base path itself via a static public dir).
4. **Attachments** — `asset_attachments` CRUD (upload/list/delete additional files:
   invoices, warranty cards, extra photos) on the asset detail page, same disk-storage pattern
   as images.
5. **Asset detail page** — header card (tag, name, badges, image) + tabs: Overview (all
   fields), Audit Log (placeholder here, built out in Phase 5), Attachments, Maintenance
   (placeholder, built out in Phase 5).
6. **QR label (confirmed: QR only, no linear barcode)** — using the `qrcode` package
   (installed in Phase 1), generate a QR code encoding the full asset detail URL
   (`{ITAM_APP_URL}/assets/{id}`), not just the raw `asset_tag` — scanning with any phone
   camera should jump straight to the asset record, no app-specific scanner needed. Render it
   on the detail page, plus a dedicated print-friendly label view/route (`/assets/[id]/label`)
   with a print stylesheet sized for common label dimensions, showing the QR code alongside the
   human-readable `asset_tag` and `name`. No new schema needed — generated at render time.
7. **Creation audit** — every asset create writes an `asset_audit_log` row with
   `action_type = 'created'`, per [[itam-schema-reference]].

## Confirmed as built

- **Create/edit is one multipart form, not JSON.** The asset fields and the optional image file
  share one request (`POST /api/assets`, `PATCH /api/assets/[id]`), so both are `FormData`.
  `lib/validation/assets.ts`'s `assetInputFromFormData()` normalizes that into the same shape
  `validateAssetInput()` expects from a JSON body, so there's one validator either way.
- **Owner assignment is a mode toggle**, not a single field: `AssetForm` switches between
  "System user" (`UserTypeahead` — fetches `/api/users` once, filters client-side; no dedicated
  search endpoint was added since the list is small) and "External / no login" (free-text
  `ownerName`/`ownerEmail`). `chk_asset_owner` (at least one of `assignedUserId`/`ownerName`) is
  enforced in `validateAssetInput()` too, so a violation is a clean 400, never a raw DB error.
- **Default status on creation** (`docs/asset-lifecycle-flow.md`: in_storage unless an owner is
  set, then active) is a client-side default in `AssetForm` only — applied until the user picks
  a status themselves, and only in create mode. This resolves an ambiguity in that doc (it says
  "owner **or location**", but location is always required, which would make the in_storage
  branch unreachable) by keying the default off owner only; flagged for confirmation.
- **Viewer department-scoping applies to both `listAssets` and `getAssetById`** — a viewer
  requesting an asset outside their department gets 404, the same as a nonexistent id, never a
  403 that would confirm the asset exists.
- **Audit logging is field-level, not action-level.** `updateAsset` diffs every mutable column
  against the row it fetched (`SELECT ... FOR UPDATE` in the same transaction) and writes one
  `asset_audit_log` row per changed field, using the specific `action_type`
  (`location_change`/`department_change`/`owner_change`/`condition_change`/`status_change`) from
  `docs/asset-lifecycle-flow.md` where it applies, `updated` otherwise. This is deliberately just
  field-level logging — the special transition rules (lost/stolen requires a note, in_repair
  should prompt a maintenance record, disposed is blocked without a disposal row) are **not**
  enforced here; that's Phase 5's dedicated-workflow job per "Explicitly out of scope" below.
- **New shared primitives this phase introduced** (available from Phase 5 on): `components/ui/
  Tabs.tsx` (Radix tabs — asset detail's Overview/Audit Log/Attachments/Maintenance);
  `DropdownMenuCheckboxItem` added to `components/ui/DropdownMenu.tsx`; `components/shared/
  MultiSelectFilter.tsx` (built on that checkbox item — no Radix Popover/Combobox exists in the
  fixed dependency set, so the list page's Status/Category/Department/Location/Condition filters
  use this instead of a proper combobox); `lib/badgeVariants.ts` (the shared status/condition ->
  Badge variant map [[itam-design-system]] calls for — used by both the list table and the
  detail header, and available for Phase 5's audit timeline too).
- **`lib/db/query.ts` gained `isForeignKeyViolation()`** alongside Phase 3's
  `isUniqueViolation()` — create/edit catch a bad category/location/department/condition/
  status/vendor/assigned-user id (Postgres 23503) and return a clean 400 instead of a raw 500;
  a duplicate `asset_tag` (23505) returns 409.
- **The label route stays inside the `(dashboard)` group** at `assets/[id]/label/page.tsx`,
  unlike the root `page.tsx`/`/403` precedent of living outside it. Print chrome is suppressed
  instead via a `print:hidden` utility added to `AppShell`'s `Sidebar`/`Topbar` (both now take a
  `className` prop) and `print:` utilities on `AppShell`'s `<main>` — so every current and future
  page under `(dashboard)` gets clean print output for free, not just this one route.
- **Soft delete (`assets.deleted_at`) was not implemented.** `itam-schema-reference` describes
  it, but neither this phase's Steps nor its Exit criteria call for a delete action (only
  list/filter/search/create/edit/view) — treated as out of scope rather than improvised.
  Confirmed with the user and assigned to `phase-5-asset-lifecycle` (see its Step 7) instead,
  since it belongs alongside that phase's other admin-gated, asset-ending actions.
- `@types/qrcode` added as a devDependency (the `qrcode` package ships no types).
- **Money fields are KES.** Confirmed with the user (the company is Kenya-based). The detail
  page formats `purchase_cost`/`salvage_value` via `lib/format.ts`'s `formatCurrency()`
  (`Intl.NumberFormat` locale `en-KE`, currency `KES`); the create/edit form labels those two
  inputs "(KES)". No currency column was added to the schema — everything is assumed KES, same
  as the schema's existing `NUMERIC(12,2)` fields carry no currency of their own. Phase 6
  (dashboard/reporting, exceljs exports) should reuse `formatCurrency()` rather than re-deriving
  currency formatting.

## Bug found via manual click-through (fixed)

`pg` parses `DATE`/`TIMESTAMPTZ` columns into native `Date` objects, not strings. Every prior
`lib/db/*.ts` mapper (Phases 1-3 included) passed those columns straight through untouched, and
it never mattered — every consumer went through an API route's `NextResponse.json()`, and
`JSON.stringify` calls `Date#toJSON()` for you, silently turning the `Date` into an ISO string.
This phase's `assets/[id]/page.tsx` and `assets/[id]/edit/page.tsx` were the **first** place in
the codebase to call a `lib/db` function directly from a Server Component and hand a
date-bearing row straight to a Client Component (`AssetForm`) with no JSON round-trip in
between — so the raw `Date` object reached `initialState()`'s `asset.purchaseDate?.slice(0, 10)`
and crashed (`TypeError: ...slice is not a function`), a 500 on `/assets/[id]/edit` for any
asset with a `purchaseDate` or `warrantyExpiry` set. `curl`-based verification never caught
this because it only ever exercised the `/api/assets/*` JSON routes, where the bug is invisible.

Fixed at the mapping layer, not the call site — `lib/db/dates.ts` (new) exports two helpers, and
every `lib/db/assets.ts`/`assetAttachments.ts` mapper now normalizes through one of them so its
output is a real `string` regardless of call path:
- `toIsoString()` — for genuine instants (`created_at`, `updated_at`, `uploaded_at`): converts
  to UTC ISO, which is correct because these have real time-of-day semantics.
- `toDateOnlyString()` — for pure `DATE` columns (`purchase_date`, `warranty_expiry`): reads the
  `Date` object's **local** year/month/day, not UTC. This mattered independently of the type
  bug — the dev server runs in `Africa/Nairobi` (UTC+3), `pg` builds a `DATE`'s `Date` object at
  local midnight, and naively calling `.toISOString().slice(0, 10)` on that (what a first fix
  attempt did) shifts the date backward a full day (`2024-01-15` local midnight becomes
  `2024-01-14T21:00:00.000Z`). Caught by re-verifying live after the first fix, not by
  inspection — worth remembering this class of bug has two layers, not one.
  `updateAsset`'s audit-diff comparison (`fieldFromAsset`) relies on this too: comparing a
  correctly-normalized `YYYY-MM-DD` against the form's `YYYY-MM-DD` is what makes an unchanged
  date register as unchanged, rather than writing a spurious `updated` audit row on every edit.

**Any future `lib/db/*.ts` mapper with a date/timestamp column must use one of these two
helpers** — never pass a `pg` date/timestamp column through unconverted, even though it happens
to work today for every Phase 1-3 module (because nothing yet calls them from a Server Component
the way this phase's asset pages do).

## Exit criteria

- Full create/read/update flow works for an asset including image upload — verified live via
  `curl` against the running dev server (matching Phase 2/3's precedent of no test framework in
  the fixed dependency set): created an asset with an external owner, fetched it (single +
  list), edited it (location + condition change), then uploaded an image on a second edit and
  confirmed it's served back correctly (200, correct `Content-Type`) from disk under
  `ASSET_FILES_BASE_PATH`.
- List page filters and viewer department-scoping both verified: a viewer in a different
  department gets an empty list and a 404 (not 403) on the direct detail route/API for that
  asset.
- QR label renders and prints correctly, scannable back to the correct asset: `/assets/[id]/
  label` server-renders a `data:image/png;base64` QR encoding `{ITAM_APP_URL}/assets/{id}`
  alongside the asset tag/name; confirmed present in the rendered HTML.
- Every create/edit writes to `asset_audit_log` — verified live: one `created` row on `POST`; a
  `PATCH` changing `location_id` and `condition_id` produced one `location_change` and one
  `condition_change` row each with correct old/new values.
- Attachments CRUD verified live against disk: uploaded a file, served it back via the file
  route, deleted it, and confirmed both the DB row and the disk file were removed.
- Duplicate `asset_tag` -> 409; a nonexistent referenced id (e.g. `categoryId`) -> 400 via
  `isForeignKeyViolation()`, never a raw 500.
- `tsc --noEmit` and `npm run lint` both clean.
- **Now verified in a live browser, via Playwright — but it took two attempts and a real bug
  in between.** The first Playwright install hung indefinitely (no output, twice, ~5 min each);
  a later retry connected and downloaded fine, so that was transient, not a hard block. The user
  did a manual click-through in the gap between attempts and hit a real crash the `curl`-only
  verification structurally could not see (see "Bug found via manual click-through" below) —
  concrete evidence that a live click-through is not optional for pages built this way. Once
  Playwright worked: minted an admin session cookie directly (`jose`, same `JWT_SECRET`), drove
  all five pages (list/create/detail/edit/label) plus the Status multi-select filter and the
  owner-mode toggle, at both desktop and a 390px mobile viewport. Zero console/page errors
  anywhere; screenshots confirm correct data, correct badges/currency, the filter dropdown
  checking "active" and narrowing the list with the URL updating to `?statusId=1`, the
  owner-mode toggle correctly swapping `UserTypeahead` for the free-text fields, and the mobile
  layout collapsing to one column per [[itam-design-system]].

## Explicitly out of scope for this phase (Phase 5 handles these)

- Transfer actions (location/department/owner change as a dedicated workflow with audit
  logging beyond the initial create)
- Condition/status change workflows
- Maintenance and disposal

## Produces (for later phases to reference)

- `lib/db/assets.ts` (`listAssets`, `getAssetById`, `createAsset`, `updateAsset` — includes the
  audit-log diffing, see "Confirmed as built" — `setAssetImagePath`), `lib/db/assetAttachments.ts`
- `lib/validation/assets.ts` (`validateAssetInput`, `assetInputFromFormData`)
- `lib/files/upload.ts`, `lib/badgeVariants.ts`, `lib/format.ts` (`formatCurrency`); `lib/db/
  query.ts` extended with `isForeignKeyViolation()`; `lib/db/dates.ts` (`toIsoString`,
  `toDateOnlyString` — see "Bug found via manual click-through" above; every future `lib/db`
  mapper with a date/timestamp column must use one of these)
- `components/ui/Tabs.tsx` (new); `components/ui/DropdownMenu.tsx` extended with
  `DropdownMenuCheckboxItem`; `components/shared/MultiSelectFilter.tsx`
- `components/assets/{AssetsList,AssetForm,AssetDetail,AssetAttachments,AssetQrCode,UserTypeahead}.tsx`
- `app/(dashboard)/assets/{page.tsx,new/page.tsx,[id]/page.tsx,[id]/edit/page.tsx,[id]/label/page.tsx}`
- `app/api/assets/route.ts` + `[id]/route.ts` (GET/POST/PATCH — no DELETE, see "Confirmed as
  built" on soft delete), `[id]/image/route.ts` (GET, serves from disk),
  `[id]/attachments/route.ts` + `[attachmentId]/route.ts` + `[attachmentId]/file/route.ts`
- `types/asset.ts`, `types/assetAttachment.ts`
- `components/layout/{Sidebar,Topbar}.tsx` extended with a `className` prop; `AppShell.tsx`
  updated with `print:hidden`/`print:` utilities

## Related skills

- `skills/phase-5-asset-lifecycle` — transfers, condition/status changes, maintenance, disposal;
  also where the Audit Log tab's placeholder becomes a real timeline, and where the asset list's
  row actions gain Transfer/Dispose alongside this phase's View/Edit
- `docs/asset-lifecycle-flow.md` — default status logic on creation; the transition rules this
  phase's basic field-level audit logging deliberately does not enforce
