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

## Exit criteria

- Every mutation described above produces the correct `asset_audit_log` row(s), verified by
  checking the timeline UI after each action.
- Disposal is unreachable via the generic status-change path; only via the dedicated flow.
- Maintenance → status prompts work end-to-end (in_progress → in_repair, completed → restore).
- Soft delete is admin-only, distinct from disposal in its confirmation copy, and a
  soft-deleted asset disappears from the list/detail/API immediately (already true by
  construction, since Phase 4's queries filter on `deleted_at IS NULL` — verify it stays true).

## Produces (for later phases to reference)

- `lib/db/{auditLog,maintenance,disposals}.ts`; `lib/db/assets.ts` extended with a soft-delete
  function
- Transfer/condition/status/disposal/delete `Dialog` components (reusable from the asset list
  row actions too, not just the detail page)
- Audit log timeline component
- `app/api/assets/[id]/route.ts` extended with `DELETE`

## Related skills

- [[itam-schema-reference]] — unified audit log rationale
- `docs/asset-lifecycle-flow.md` — full state machine (read before implementing)
- `skills/phase-6-dashboard-reporting` — consumes audit log + disposal data for reports
