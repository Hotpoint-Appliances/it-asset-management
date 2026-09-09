---
name: phase-3-core-data
description: Phase 3 — CRUD management for supporting/lookup tables (categories, locations, departments, vendors, asset conditions, asset statuses, users). Depends on phase-2-auth.
---

# Phase 3 — Core Data Management

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].
Depends on `phase-2-auth` (RBAC) being complete.

Before starting the Steps below, run [[phase-completion-check]] against `phase-2-auth`'s exit
criteria.

## Objective

Admin-facing CRUD for every table the `assets` table depends on, so Phase 4 (asset management)
has real data to select from instead of empty dropdowns.

## Scope (one CRUD module each)

- `categories` — tree-aware (self-referencing `parent_category_id`). Build a nested
  list/tree picker component here; Phase 4's asset form reuses it.
- `locations` — tree-aware (self-referencing `parent_location_id`). Same tree picker pattern
  as categories — extract a shared `<TreePicker>` component rather than duplicating.
- `departments` — flat CRUD.
- `vendors` — flat CRUD (name, contact fields).
- `asset_conditions` — flat CRUD, admin-only, `sort_order` editable (drag-to-reorder is a nice-
  to-have, not required for MVP — a numeric field is sufficient).
- `asset_statuses` — flat CRUD, admin-only. **Caution**: changing/removing a status that's
  referenced by existing assets must be blocked or handled explicitly (reassign-before-delete),
  never a silent FK violation surfaced as a raw 500.
- `users` — admin-only. Create/edit/deactivate (never hard-delete a user referenced by
  `assets.created_by` or `asset_audit_log.performed_by` — use `is_active = false` instead).
  Role assignment restricted to admin.

## Access rules

- All of the above are `admin`-only for create/edit/delete.
- `asset_manager` and `viewer` get read-only access (needed for dropdowns/filters in Phase 4+),
  scoped via the same RBAC middleware from Phase 2.

## UI pattern

Use the list/table + modal-form pattern from [[itam-design-system]] for every flat CRUD module;
use the tree picker + inline add for the two hierarchical ones (categories, locations). Keep
all seven modules under a single `/app/(dashboard)/settings/*` route group with a sub-nav,
rather than seven separate top-level nav items — keeps the sidebar from [[itam-design-system]]'s
app shell clean.

## Exit criteria

- Every lookup table has working create/edit/delete (or deactivate, for users) through the UI.
- Deleting a category/location/vendor/condition/status that's referenced by an existing asset
  is blocked with a clear error, not a raw DB constraint failure.
- An admin, asset_manager, and viewer login each see the correct read/write access per table.

## Produces (for later phases to reference)

- `lib/db/{categories,locations,departments,vendors,assetConditions,assetStatuses,users}.ts`
- `<TreePicker>` shared component (categories, locations)
- `/app/(dashboard)/settings/*` pages

## Related skills

- [[itam-schema-reference]] — hierarchy design decisions for categories/locations
- `skills/phase-4-asset-management` — first consumer of all these lookup tables
