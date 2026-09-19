---
name: itam-schema-reference
description: Explains the ITAM database schema decisions and table relationships — load whenever writing SQL, DB query functions, or TypeScript types against schema/schema.sql.
---

# ITAM — Schema Reference

Companion to `schema/schema.sql`, which is the source of truth. This explains _why_ the schema
looks the way it does so implementation stays consistent with the design decisions below.

## Key design decisions

1. **Unified audit log, not per-action history tables.** `asset_audit_log` records every
   location/department/owner/condition/status change plus creation, updates, maintenance, and
   disposal — one `action_type` + `field_name`/`old_value`/`new_value` row per event. Any code
   that mutates a tracked field on `assets` must insert a matching `asset_audit_log` row in the
   same DB transaction. Do not add new per-field history tables — extend `action_type` instead.

2. **Ownership is dual-mode.** `assets.assigned_user_id` links to `users` when the owner has a
   system login; `owner_name`/`owner_email` are free-text fallbacks for owners who don't
   (external stakeholders, generic pool assets). The check constraint `chk_asset_owner`
   enforces at least one of the two is set. When building the asset form, prefer a
   type-ahead search against `users` first, falling back to free-text entry.

3. **UUID vs SERIAL primary keys.** `assets` and `users` use UUID (exposed in URLs, needed
   across modules, avoid enumeration). Lookup/reference tables (`categories`, `locations`,
   `departments`, `vendors`, `roles`, `asset_conditions`, `asset_statuses`) use SERIAL — they're
   admin-managed internally and never exposed as public identifiers.

4. **Conditions and statuses are tables, not enums.** Both are explicitly admin-editable
   (`asset_conditions`, `asset_statuses`) because the stakeholder flagged condition options as
   "fluid." Never hardcode condition/status strings in application logic beyond the seeded
   defaults — always resolve against these tables so an admin can add e.g. a `damaged` condition
   without a code change.

5. **Warranty/vendor/depreciation fields are in MVP**, not deferred: `vendor_id`,
   `purchase_date`, `purchase_cost`, `warranty_expiry`, `depreciation_method`,
   `useful_life_months`, `salvage_value` all live directly on `assets`. Depreciation
   _computation_ (a schedule/report) is a later-phase feature — the schema just captures the
   inputs now so it isn't a retrofit later.

6. **Soft delete is not disposal.** `assets.deleted_at` is for correcting data-entry mistakes
   only (admin-only action). Disposal is a first-class state (`asset_statuses.disposed` +
   an `asset_disposals` row) that preserves the record and its full audit trail. Never confuse
   the two in queries — "active fleet" filters should exclude `deleted_at IS NOT NULL` AND
   typically exclude `status = 'disposed'` depending on the view.

7. **Location and category hierarchy.** Both `locations` and `categories` self-reference via
   `parent_location_id` / `parent_category_id` for tree structures (Site → Building → Floor →
   Room; Hardware → Laptops). Phase 3 (core data) must build a tree-aware picker component, not
   a flat dropdown.

## Table reference

| Table               | Purpose                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `roles`             | 3-tier RBAC: admin, asset_manager, viewer                                                        |
| `departments`       | Org departments, referenced by users and assets                                                  |
| `locations`         | Physical locations, self-referencing hierarchy                                                   |
| `categories`        | Asset categories, self-referencing hierarchy                                                     |
| `vendors`           | Suppliers — used by assets (purchase) and asset_maintenance (repair vendor)                      |
| `asset_conditions`  | Admin-editable condition lookup (seeded: good/bad/worse)                                         |
| `asset_statuses`    | Admin-editable status lookup (seeded: active/in_storage/reserved/in_repair/lost/stolen/disposed) |
| `users`             | System users; role + optional department                                                         |
| `assets`            | Core entity — see full column list in schema.sql                                                 |
| `asset_audit_log`   | Unified history for every tracked asset event                                                    |
| `asset_attachments` | Multiple files per asset (invoices, warranty cards, extra photos) beyond `assets.image_path`     |
| `asset_maintenance` | Repair/service/inspection events                                                                 |
| `asset_disposals`   | One row per disposed asset — required before status can become `disposed`                        |
| `notifications`     | In-app notifications + email-sent flag (Graph email)                                             |
| `system_settings`   | Admin-editable key/value config                                                                  |

## When writing query functions (`lib/db/*.ts`)

- One file per table/domain (e.g. `lib/db/assets.ts`, `lib/db/auditLog.ts`).
- Any function that updates `assets` fields covered by the audit log must accept the
  `performed_by` user id and write the audit row — don't leave this to the caller to remember.
- Read `docs/asset-lifecycle-flow.md` before implementing the disposal or status-change
  endpoints — there are transition rules (e.g. disposal requires an `asset_disposals` row in
  the same transaction) that aren't visible from the schema alone.

## Related skills

- [[itam-conventions]] — naming/folder conventions this schema's TypeScript types follow
- `docs/asset-lifecycle-flow.md` — state machine and transition rules
- `skills/phase-3-core-data`, `skills/phase-4-asset-management`, `skills/phase-5-asset-lifecycle`
  — the phases that build directly on this schema
