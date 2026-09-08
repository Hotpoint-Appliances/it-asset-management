---
name: phase-4-asset-management
description: Phase 4 — core asset CRUD, image/file upload to disk, and QR code label generation. Depends on phase-3-core-data.
---

# Phase 4 — Asset Management

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].
Depends on `phase-3-core-data` (all dropdown/lookup data must already be manageable).

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

## Exit criteria

- Full create/read/update flow works for an asset including image upload.
- List page filters and viewer department-scoping both verified.
- QR label renders and prints correctly, scannable back to the correct asset.
- Every create/edit writes to `asset_audit_log`.

## Explicitly out of scope for this phase (Phase 5 handles these)

- Transfer actions (location/department/owner change as a dedicated workflow with audit
  logging beyond the initial create)
- Condition/status change workflows
- Maintenance and disposal

## Produces (for later phases to reference)

- `lib/db/assets.ts`, `lib/db/assetAttachments.ts`
- `/app/(dashboard)/assets/*` pages
- `/api/assets/*`, `/api/assets/[id]/attachments`, `/api/assets/[id]/label`
- Disk upload helper `lib/files/upload.ts`

## Related skills

- `skills/phase-5-asset-lifecycle` — transfers, condition/status changes, maintenance, disposal
- `docs/asset-lifecycle-flow.md` — default status logic on creation
