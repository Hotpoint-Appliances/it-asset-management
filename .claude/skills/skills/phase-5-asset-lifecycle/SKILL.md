---
name: phase-5-asset-lifecycle
description: Phase 5 — transfer workflows (location/department/owner), condition/status changes, maintenance tracking, and disposal. The audit-log timeline UI. Depends on phase-4-asset-management.
---

# Phase 5 — Asset Lifecycle Workflows

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].
Read `docs/asset-lifecycle-flow.md` in full before starting this phase — it defines the state
machine and transition rules this phase implements. Depends on `phase-4-asset-management`.

Before starting the Steps below, run [[phase-completion-check]] against
`phase-4-asset-management`'s exit criteria.

## Objective

All the actions that happen to an asset *after* creation: transfers, condition/status changes,
maintenance events, and disposal — each fully audit-logged and surfaced as a timeline on the
asset detail page.

## Steps

1. **Transfer action** — a `Dialog` (modal, per [[itam-design-system]]) accessible from the
   asset detail page and list row actions: change location, department, and/or owner
   (assigned_user_id or owner_name/owner_email) in one submission. On save: update `assets`,
   write one `asset_audit_log` row per changed field (`location_change`,
   `department_change`, `owner_change`) in a single transaction (`withTransaction` from Phase
   1).
2. **Condition change action** — smaller `Dialog`, update `condition_id`, write a
   `condition_change` audit row.
3. **Status change action** — `Dialog` with status dropdown (sourced from `asset_statuses`).
   Enforce the transition rules from `docs/asset-lifecycle-flow.md`:
   - → `lost`/`stolen`: require a `note`, pass it into the audit row.
   - → `disposed`: **block** this path entirely — disposal must go through the dedicated
     disposal flow (step 5), not the generic status dropdown, so the `asset_disposals` record
     is never skipped.
   - → `in_repair`: prompt to also create an `asset_maintenance` record (step 4), don't force it.
4. **Maintenance module** — `asset_maintenance` CRUD on the asset detail page's Maintenance
   tab: create (type, vendor, scheduled_date, notes), update status
   (scheduled → in_progress → completed/cancelled). Marking `in_progress` prompts a status
   change to `in_repair` on the asset (reuse step 3's action); marking `completed` prompts
   restoring the asset's prior status.
5. **Disposal flow** — dedicated action (not a status dropdown option): form collects
   `disposal_date`, `disposal_method`, `disposal_value`, `notes`, `attachment_path`; requires
   `asset_manager` or `admin` role. On submit, in one transaction: insert `asset_disposals` row,
   update `assets.status_id` to `disposed`, write a `disposed` audit row. Confirmation dialog
   must state the consequence explicitly per [[itam-design-system]].
6. **Audit log timeline** — asset detail page's Audit Log tab: chronological list from
   `asset_audit_log` (newest first), rendering `action_type`, human-readable field/old/new
   values, `note`, performed-by user name, timestamp. This is the payoff of the unified audit
   log design — one query, one component, covers every action type.
7. **Soft delete (data-entry correction only — not disposal, not Phase 4 scope)** — admin-only
   action, added here rather than Phase 4 because it belongs with this phase's other
   asset-ending, confirmation-gated actions. Sets `assets.deleted_at = now()` and writes a
   `deleted` `asset_audit_log` row (mutating a tracked column always gets an audit row, per
   [[itam-schema-reference]], even though the row becomes unreachable through the normal
   timeline once the asset itself is excluded from every query — it stays in the DB for
   forensic purposes). Per [[itam-schema-reference]] point 6: **never** conflate this with
   disposal — a confirmation `Dialog` must say plainly that this is for correcting a mistaken
   entry, not for retiring a real asset (disposal is step 5, above). Expose as
   `DELETE /api/assets/[id]`; every `lib/db/assets.ts` query from Phase 4 already filters on
   `deleted_at IS NULL`, so no read-path changes are needed here.

## Confirmed as built

- **`approved_by` on `asset_disposals` is the session user performing the disposal call, not a
  form field.** The schema makes it `NOT NULL`, the lifecycle doc lists it as required, but this
  phase's own Step 5 field list (disposal_date/method/value/notes/attachment_path) omits it — a
  real discrepancy, resolved by treating the actor (already gated to admin/asset_manager) as the
  approver. Documented in `lib/db/disposals.ts`'s `disposeAsset()` doc comment.
- **Every dedicated lifecycle action (transfer/condition/status) reuses `updateAsset`'s
  field-diffing audit logic**, not a separate write path. `lib/db/assets.ts`'s
  `updateAssetInternal()` is the shared transaction body; `patchAssetFields()` merges a partial
  patch onto whatever `updateAssetInternal`'s own `FOR UPDATE` read finds (not a separate
  unlocked read first — that would let a stale merge base silently revert a field touched by a
  concurrent transaction) before calling it. `transferAsset`/`changeAssetCondition`/
  `changeAssetStatus` are thin wrappers around this.
- **Transfer/condition/status are all blocked once an asset is `disposed`** (checked in each
  route before calling the DB layer) — not explicitly required by the Steps above, but disposal
  is described as terminal throughout `docs/asset-lifecycle-flow.md`, so allowing further
  lifecycle mutations on a disposed asset would contradict that. The UI hides the actions too
  (`AssetDetail`'s `hasLifecycleActions = canManage && !isDisposed`), so the API check is
  defense-in-depth, not the only guard.
- **The maintenance module's two prompts are real confirm dialogs wired to live data, not just
  UI copy.** Marking a maintenance record `in_progress` shows a `ConfirmDialog` offering to set
  the asset's status to `in_repair` (calls the Step 3 status-change action directly, skipping
  `StatusDialog`'s manual picker since the target is fixed). Marking `completed` resolves what
  status to restore via `lib/db/auditLog.ts`'s `findStatusBeforeMostRecentInRepair()` — reads the
  most recent `status_change` audit row whose `new_value` is the in_repair status id and returns
  its `old_value` — a no-schema-change use of the unified audit log design, returned as the
  maintenance PATCH route's `suggestedRestoreStatusId` (`null` if no such transition is on
  record, e.g. an asset created directly `in_repair`; the client then skips the prompt). **The
  restored status can itself require a note** (the prior status was `lost`/`stolen`) — the
  restore `ConfirmDialog` detects this via `StatusDialog`'s exported `NOTE_REQUIRED_STATUSES` and
  shows a note field, disabling Confirm until filled; without this the restore silently 400'd
  (caught live via Playwright, see "Bug found" below).
- **`StatusDialog` excludes `disposed` from its own dropdown** (not just rejecting it
  server-side) — the API's 400 for that path still exists (`docs/asset-lifecycle-flow.md`'s
  "blocked unless via dedicated flow" rule), but the dropdown omission is a UX nicety on top,
  since disposal always needs the dedicated form (disposal_date/method/etc.), not a bare status
  pick.
- **List row actions gained Transfer/Dispose** (`AssetRowActions.tsx`), reusing the same
  `TransferDialog`/`DisposalDialog` the detail page uses — `AssetListItem` (Phase 4) was extended
  with `locationId`/`departmentId`/`assignedUserId`/`ownerEmail` (previously only the *Name
  display columns) so the list row's Transfer dialog can prefill without a second fetch.
  Condition/status change stayed detail-page-only per the Steps above (only Step 1's transfer
  explicitly calls out list row actions).
- **New shared primitive this phase introduced**: `components/shared/ConfirmDialog.tsx` — generic
  confirm/prompt dialog reused by soft delete, the maintenance module's two prompts, and
  available for Phase 6+. Its `description` renders via `DialogDescription asChild` into a
  `<div>` rather than Radix's default `<p>`, specifically so it can carry block content (the
  restore prompt's note `<textarea>`) — see "Bug found" below for why that matters.
- `lib/hooks/useSyncOnOpen.ts` (new) — every Dialog in this phase resets its form to current
  values via this instead of a `useEffect`, because this project's eslint config
  (`react-hooks/set-state-in-effect`) flags synchronous setState-in-effect; it's the
  React-documented "adjusting state when a prop changes" render-time pattern instead.

## Bug found via testing (fixed)

- **Restoring to a note-required status 400'd silently.** The maintenance "mark completed ->
  restore prior status" prompt always posted `note: null`. When the resolved prior status was
  `lost`/`stolen` (a real, if unusual, sequence: asset marked lost, then someone puts it through
  a repair attempt, then the repair is marked complete), the status route correctly rejects a
  note-less transition to those statuses — but the restore flow had no way to supply one. Caught
  live via Playwright (a console 400 that the UI otherwise swallowed into a generic error toast,
  easy to miss without watching network responses). Fixed by giving the restore `ConfirmDialog` a
  conditional note field (see "Confirmed as built" above).
- **Nested-`<p>` hydration error from the fix above.** Once the restore prompt's description
  needed to carry a `<textarea>`, `ConfirmDialog`'s `<DialogDescription>` (Radix renders this as
  a `<p>`) triggered "`<div>` cannot be a descendant of `<p>`" and a hydration mismatch — only
  visible via Playwright's console listener, not from the 200-status happy path. Fixed via
  `DialogDescription asChild` rendering into a `<div>` instead (see "Confirmed as built" above);
  every other `ConfirmDialog` caller with inline-only description text (soft delete, the
  in_repair prompt) is unaffected but benefits from the same fix.
- **Stale Turbopack dev cache produced a `TypeError: transferAsset is not a function`,
  empty-body 500** after `lib/db/assets.ts` gained several new exports mid-session (`tsc`/eslint
  were clean throughout — this was purely a dev-server incremental-compile staleness issue, not
  a code defect). Touching the affected files didn't invalidate it; a full dev server restart
  (clearing `.next/dev`) did. Worth knowing if a route 500s with an empty body and no visible
  cause despite clean `tsc`/lint: restart the dev server before assuming the code is wrong.

## Exit criteria

- Every mutation described above produces the correct `asset_audit_log` row(s) — verified live
  via Playwright end-to-end (not just API calls): transfer, condition change, status change
  (including the lost/stolen note requirement), maintenance start/complete, and disposal all
  produced the expected timeline entries, visible and correctly labeled (with lookup names, not
  raw ids — see `AuditLogTimeline`'s `LOOKUP_BY_FIELD` resolution) on the Audit Log tab.
- Disposal is unreachable via the generic status-change path (`POST .../status` with the
  `disposed` id returns 400; `disposed` isn't even offered in `StatusDialog`'s dropdown) — only
  via `POST .../dispose`, verified live including the double-dispose case (409/400, never a
  silent second `asset_disposals` row: the table's `UNIQUE(asset_id)` constraint backs this even
  under a race).
- Maintenance → status prompts verified end-to-end live, including the note-required edge case
  discovered during that verification (see "Bug found" above): in_progress → in_repair prompt
  confirmed and applied; completed → restore prompt correctly resolved and applied the prior
  status, collecting a note when the restored status required one.
- Soft delete verified live: admin-only (403 for asset_manager/viewer, both via the confirm
  dialog being absent from a non-admin's Actions menu and via a direct API call), confirmation
  copy explicitly distinguishes it from disposal, and the soft-deleted asset 404s immediately
  everywhere (list/detail/API) — Phase 4's `deleted_at IS NULL` filtering held, as expected.
- Transfer/condition/status/dispose all correctly blocked once an asset is disposed (400s
  verified live; the Actions menu also stops offering them, verified via Playwright).
- Viewer role forbidden (403) from every lifecycle-mutating endpoint (transfer verified live;
  the others share `requireApiRole(["admin", "asset_manager"])` and DELETE's admin-only check).
- `tsc --noEmit` and `npm run lint` both clean throughout.
- **Verified live in a real browser via Playwright** (already a persisted devDependency as of
  the Phase 4 re-verification pass that preceded this phase — see `itam-conventions`): two full
  runs, ~35 assertions total, covering every Dialog (Transfer from both detail and list row,
  Condition, Status with the note-required branch, Disposal with its consequence copy, the
  maintenance module's create/status-update/two-prompt flow, and soft delete's confirm dialog),
  plus a mobile-width (390px) smoke pass. Zero console/page errors on the final run — two real
  bugs (both above) were caught and fixed during this process, not before it.

## Produces (for later phases to reference)

- `lib/db/auditLog.ts` (`listAuditLogForAsset`, `findStatusBeforeMostRecentInRepair`),
  `lib/db/maintenance.ts` (`listMaintenanceForAsset`, `getMaintenanceById`, `createMaintenance`,
  `updateMaintenance`), `lib/db/disposals.ts` (`getDisposalByAssetId`, `disposeAsset`,
  `setDisposalAttachmentPath`); `lib/db/assets.ts` extended with `transferAsset`,
  `changeAssetCondition`, `changeAssetStatus`, `softDeleteAsset` (all funnel through the new
  shared `updateAssetInternal`/`patchAssetFields`), plus `mapAsset`/`SELECT_COLUMNS`/`AssetRow`
  now exported for `disposals.ts` to reuse
- `lib/validation/assetLifecycle.ts` (`validateTransferInput`, `validateMaintenanceInput`,
  `validateMaintenanceUpdateInput`, `validateDisposalInput`, `disposalInputFromFormData`)
- `lib/files/upload.ts` extended with `saveAssetDisposalAttachment`
- `lib/hooks/useSyncOnOpen.ts` (new — see "Confirmed as built")
- `components/shared/ConfirmDialog.tsx` (new, generic — see "Confirmed as built")
- `components/assets/{TransferDialog,ConditionDialog,StatusDialog,DisposalDialog,
  AuditLogTimeline,MaintenanceTab,AssetRowActions}.tsx`; `AssetDetail.tsx` extended with the
  Actions dropdown (Transfer/Change condition/Change status/Dispose/Delete) and the Audit Log/
  Maintenance tabs' real content; `AssetsList.tsx`'s row actions replaced with
  `AssetRowActions.tsx`'s DropdownMenu (View/Edit/Transfer/Dispose)
- `types/auditLog.ts`, `types/maintenance.ts`, `types/disposal.ts`; `types/asset.ts`'s
  `AssetListItem` extended with `locationId`/`departmentId`/`assignedUserId`/`ownerEmail`
- `app/api/assets/[id]/{transfer,condition,status,dispose}/route.ts` (all POST);
  `app/api/assets/[id]/maintenance/route.ts` (GET/POST) + `[maintenanceId]/route.ts` (PATCH);
  `app/api/assets/[id]/route.ts` extended with `DELETE` (admin-only, soft delete)

## Related skills

- [[itam-schema-reference]] — unified audit log rationale
- `docs/asset-lifecycle-flow.md` — full state machine (read before implementing)
- `skills/phase-6-dashboard-reporting` — consumes audit log + disposal data for reports
