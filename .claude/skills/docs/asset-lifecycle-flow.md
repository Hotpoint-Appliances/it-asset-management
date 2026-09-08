# Asset Lifecycle Flow

Reference document for the IT Asset Management System. Describes every state an asset can be
in and every transition between states, so implementation phases (see `skills/phase-*`) build
consistent, complete CRUD + workflow actions around it.

## States (`asset_statuses`)

| Status       | Meaning                                              |
|--------------|-------------------------------------------------------|
| `active`     | In use, assigned or in general circulation            |
| `in_storage` | Not currently deployed (spare stock, unassigned)      |
| `reserved`   | Earmarked for a specific user/department, not deployed yet |
| `in_repair`  | Sent for maintenance/repair, temporarily unavailable   |
| `lost`       | Reported missing, unresolved                           |
| `stolen`     | Reported stolen, unresolved                             |
| `disposed`   | Terminal state — sold, scrapped, donated, or written off |

## Lifecycle diagram

```
                    ┌─────────────┐
                    │   Created   │  (asset_tag assigned, initial status:
                    └──────┬──────┘   in_storage or active if pre-assigned)
                           │
                           ▼
                 ┌───────────────────┐
        ┌───────▶│      active       │◀────────┐
        │        └─────────┬─────────┘         │
        │                  │                    │
        │     location / department / owner     │
        │     change (each logged to            │
        │     asset_audit_log)                  │
        │                  │                    │
        │                  ▼                    │
        │        ┌───────────────────┐          │
        │        │    in_storage /   │          │
        │        │     reserved      │──────────┘
        │        └─────────┬─────────┘   (assigned → active)
        │                  │
        │      sent for repair
        │                  ▼
        │        ┌───────────────────┐
        └────────┤     in_repair     │
    repair complete└─────────┬───────┘
                              │
                    reported lost/stolen
                              ▼
                    ┌───────────────────┐
                    │   lost / stolen    │
                    └─────────┬─────────┘
                              │
                     recovered → active
                     unresolved → disposed
                              │
                              ▼
                    ┌───────────────────┐
                    │      disposed      │  (terminal — requires asset_disposals record)
                    └───────────────────┘
```

## Transition rules

1. **Creation** — an asset is created with a unique `asset_tag`, required fields (name,
   category, location, department, condition, status). `image_path` and owner fields are
   optional at creation. A `created` row is written to `asset_audit_log`. Default status is
   `in_storage` unless an owner/location is set at creation time, in which case `active`.

2. **Assignment / transfer** — changing `location_id`, `department_id`, or
   `assigned_user_id`/`owner_name`/`owner_email` on an existing asset always writes a row to
   `asset_audit_log` with `action_type` = `location_change` / `department_change` /
   `owner_change`, storing old and new values. These three fields can change independently or
   together in one action.

3. **Condition change** — updating `condition_id` writes a `condition_change` row to
   `asset_audit_log` (old value → new value). No separate table; this is why the unified audit
   log was chosen over per-action mirror tables.

4. **Status change** — updating `status_id` writes a `status_change` row to `asset_audit_log`.
   Some status changes have side effects:
   - → `in_repair`: expect a corresponding `asset_maintenance` row (status `in_progress`).
   - → `lost` / `stolen`: require a `note` explaining the circumstances (enforced in app logic).
   - → `disposed`: **blocked** unless an `asset_disposals` row exists for the asset (created in
     the same transaction as the status change).

5. **Maintenance** — creating an `asset_maintenance` row does not by itself change asset
   status; the app should prompt to set status to `in_repair` when a maintenance record is
   created with `status = in_progress`, and prompt to restore the prior status when the
   maintenance record is marked `completed`.

6. **Disposal (terminal)** — requires: `disposal_date`, `disposal_method`, `approved_by`.
   On disposal: asset `status_id` → `disposed`, a `disposed` row is written to
   `asset_audit_log`, and the asset is excluded from active dashboards/reports by default
   (filtered on `status <> 'disposed'`, not on `deleted_at` — disposal is a state, not a
   delete). `deleted_at` (soft delete) is reserved for records created in error, not for
   normal disposal.

7. **Soft delete** — only used to correct data-entry mistakes (e.g., duplicate asset created
   by accident). Requires admin role. Never used for disposal, loss, or theft — those are
   statuses, and history must be preserved.

## Out of scope for MVP (documented for future phases)

- Periodic physical stock-take / reconciliation audits (would need an `asset_stocktakes` table
  comparing expected vs. scanned assets).
- Depreciation schedule computation as a scheduled job (schema supports the inputs —
  `purchase_cost`, `depreciation_method`, `useful_life_months`, `salvage_value` — but computing
  and displaying a depreciation schedule is a reporting-phase feature, not core lifecycle).
  MVP reporting uses straight-line only (confirmed); declining-balance is deferred.
- Viewer self-service issue reporting (e.g. "this laptop is broken" flagged by a viewer without
  status-change permissions). Confirmed deferred — MVP relies on informal reporting to an
  asset_manager/admin, who then makes the condition/status/maintenance change directly.
