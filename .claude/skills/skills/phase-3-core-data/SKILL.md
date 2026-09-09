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
app shell clean. **Confirmed as built**: `nav-items.ts`'s top-level Categories/Locations/
Departments/Users entries (Phase 1 placeholders) were removed in favor of a single admin-only
`Settings` item pointing at `/settings`, with `SettingsNav.tsx` (tab-style route links, not Radix
`Tabs` — these are separate bookmarkable routes, not same-page panel switching) providing the
sub-nav for the seven modules inside `app/(dashboard)/settings/layout.tsx`.

New shared infrastructure this phase introduced (available to Phase 4 onward):

- `app/(dashboard)/layout.tsx` — `requireSession()` + `<AppShell>`, so pages no longer each wrap
  themselves in `AppShell` individually. `app/(dashboard)/settings/layout.tsx` layers
  `requireRole(["admin"])` + `SettingsNav` on top for the settings section specifically.
- `components/ui/Dialog.tsx`, `components/ui/Table.tsx`, `components/ui/Select.tsx` — new
  shadcn-style primitives (`Dialog` centered ≥`sm`/full-screen below; `Table` root wrapped in
  `overflow-x-auto` — the app-wide choice for every list view's responsive pattern, per
  [[itam-design-system]]'s "pick one, apply everywhere" rule; `Select` is a styled native
  `<select>`, not Radix — native selects are already fully keyboard/ARIA accessible, so the
  extra Radix machinery wasn't justified for simple dropdowns).
- `components/ui/Toast.tsx` (`Toaster`, mounted once in `AppShell`) + a `toasts` slice added to
  the existing `store/index.ts` `useUIStore` — no Radix toast primitive exists in the fixed
  dependency set, so this is a small Zustand-backed implementation instead of a new package.
- `lib/auth/api.ts` — `getApiSession()`/`requireApiRole()`, the route-handler counterpart to
  `requireSession()`/`requireRole()` (which redirect; route handlers need JSON 401/403 instead).
  Phase 2's one GET route inlined this check; with ~7 modules × several handlers each here, the
  repetition became real rather than hypothetical.
- `lib/db/refCheck.ts` — `assertNotReferencedByAssets(column, id)` / `ReferencedByAssetsError`,
  used by every lookup table's delete path (see Exit criteria below). `lib/db/query.ts` also
  gained `isUniqueViolation()` for clean 409s on duplicate user emails.
- `lib/tree.ts` (`buildTree`, `flattenForSelect`, `collectDescendantIds`) +
  `components/shared/TreePicker.tsx` — the tree-aware picker
  [[itam-schema-reference]] calls for; an indented `<select>` used inside each create/edit
  `Dialog` to choose a parent node, reused as-is for categories and locations.
  `collectDescendantIds` also powers server-side cycle prevention (a category/location can't be
  reparented under itself or its own descendant — checked in `PATCH` before the DB write).
  `components/shared/EmptyState.tsx` is the shared "icon + copy + action" empty-list view.
- `/types/*.ts` populated for the first time (`category.ts`, `location.ts`, `department.ts`,
  `vendor.ts`, `assetCondition.ts`, `assetStatus.ts`, `user.ts`) — Phase 2's `AuthUser`/
  `UserSummary` stayed local to `lib/db/users.ts` since they weren't shared; these new shapes
  genuinely are (DB layer, API routes, and multiple components each phase).
- `lib/validation/helpers.ts` (`requireString`, `optionalString`, `optionalNumber`,
  `requireNumber`) — small pure helpers factored out once real duplication showed up across the
  seven modules' hand-rolled validators.

**Pagination exception**: per [[itam-conventions]]'s "all list endpoints paginate" rule, the flat
list endpoints (`departments`, `vendors`, `asset-conditions`, `asset-statuses`, `users`) take
`limit`/`offset` (default 100). `categories` and `locations` intentionally do **not** paginate —
the client needs the full hierarchy to render a tree, so slicing it server-side doesn't make
sense at this data size.

## Exit criteria

- Every lookup table has working create/edit/delete (or deactivate, for users) through the API
  (verified live via `curl` against the running dev server, matching Phase 2's precedent of no
  test framework in the fixed dependency set): created, edited, and deleted a department, vendor,
  asset condition, and asset status; created a parent + child category and confirmed the tree
  shape in the list response; confirmed reparenting a category under its own descendant is
  rejected with 400; deactivated a user (login then fails with 401) and reactivated them (login
  succeeds again).
- Deleting a category/location/department/vendor/condition/status that's referenced by an
  existing asset is blocked with a clean 409, not a raw DB constraint failure — proven by
  temporarily inserting one real `assets` row (via a throwaway script, since `assets` has no UI
  until Phase 4) referencing all six lookup tables at once, confirming each of the six DELETE
  endpoints returns 409 with the row in place, then removing the test asset and confirming
  deletes succeed normally again.
- An admin, asset_manager, and viewer login each see the correct read/write access: verified
  live as a `viewer` — GET `/api/categories` 200s, POST/DELETE against lookup endpoints 403
  (`requireApiRole`), and visiting `/settings/categories` directly 307-redirects to `/403`
  (`requireRole(["admin"])` in `app/(dashboard)/settings/layout.tsx`). An unauthenticated
  request to any lookup GET endpoint 401s.
- `tsc --noEmit` and `npm run lint` both clean.

## Produces (for later phases to reference)

- `lib/db/{categories,locations,departments,vendors,assetConditions,assetStatuses,users,roles}.ts`
  — `users.ts` extended with `createUser`/`updateUser`/`setUserActive`/`getUserById` alongside
  Phase 2's `findUserByEmail`/`touchLastLogin`/`listUsers`.
- `lib/validation/{categories,locations,departments,vendors,assetConditions,assetStatuses,users,helpers}.ts`
- `lib/db/refCheck.ts`, `lib/auth/api.ts`, `lib/tree.ts`
- `/types/{category,location,department,vendor,assetCondition,assetStatus,user}.ts`
- `components/ui/{Dialog,Table,Select,Toast}.tsx`
- `components/shared/{TreePicker,EmptyState}.tsx`
- `app/(dashboard)/layout.tsx`, `app/(dashboard)/settings/layout.tsx`,
  `components/layout/SettingsNav.tsx`
- `app/(dashboard)/settings/{categories,locations,departments,vendors,conditions,statuses,users}/`
  — each a `page.tsx` (server component, fetches via `lib/db`) + a client `*Manager.tsx`
  (table/tree view + create-edit `Dialog` + delete-confirm `Dialog`, mutating via `axios` +
  `router.refresh()`, feedback via the new `Toaster`)
- `app/api/{categories,locations,departments,vendors,asset-conditions,asset-statuses}/route.ts`
  + `[id]/route.ts`; `app/api/users/route.ts` extended with `POST`, new
  `app/api/users/[id]/route.ts` (`PATCH` for edit and deactivate/reactivate)
- `store/index.ts` — `toasts` slice (`Toast`, `addToast`, `removeToast`) added alongside Phase 1's
  `mobileNavOpen`
- `nav-items.ts` reduced to `Dashboard`/`Assets`/`Reports`/`Settings` (admin-only)

## Related skills

- [[itam-schema-reference]] — hierarchy design decisions for categories/locations
- `skills/phase-4-asset-management` — first consumer of all these lookup tables, and of
  `app/(dashboard)/layout.tsx` + the new `Dialog`/`Table`/`TreePicker`/`Toaster` primitives
