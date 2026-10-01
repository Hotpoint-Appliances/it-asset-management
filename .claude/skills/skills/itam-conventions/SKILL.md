---
name: itam-conventions
description: Base conventions for the IT Asset Management System build — stack, folder structure, naming, env vars, and coding standards. Load this before any phase-* skill; it is the shared foundation every other skill assumes.
---

# ITAM — Base Conventions

This is the foundation skill. Every `phase-*` skill assumes the conventions here. Load this
first when starting any implementation work on the IT Asset Management System.

## Stack (fixed — do not substitute)

- Next.js 16, App Router, TypeScript
- `jose` — JWT session handling (stateless; no server-side session table)
- `zustand` — global client state
- `@tanstack/react-query` — async data fetching/caching
- `bcryptjs` — password hashing
- `axios` — HTTP requests (internal API calls from client components)
- `exceljs` — data export (reports phase)
- `lucide-react` — icons
- `next-themes` — dark/light mode
- `pg` — raw PostgreSQL queries (no ORM — write SQL directly against `schema/schema.sql`)
- `@azure/msal-node` + Microsoft Graph — email notifications
- Dev: Tailwind CSS, Prettier, TypeScript, ESLint, `@types/qrcode` (added Phase 4 — the `qrcode`
  package ships no types of its own), `playwright` (added as a persisted devDependency during
  Phase 4's completion verification, plus the Chromium binary via `npx playwright install
chromium` — the earlier in-phase attempt used an ephemeral `npx` invocation that hung once and
  left no trace in `package.json`; installing it for real means later phases don't need to
  reinstall from scratch to do their own live-browser exit-criteria checks)
- UI pattern: shadcn/ui style (Radix primitives + Tailwind) — see `itam-design-system` skill
- Barcode/QR: `qrcode` (QR) for asset tag labels — see `phase-4-asset-management`

No ORM is introduced. All queries go through a thin `lib/db` query layer using `pg`.

## Folder structure

```
proxy.ts                        # Next.js 16 renamed middleware.ts to proxy.ts — auth-presence
                                 # redirect only (login gate), added in Phase 2
/app
  /(dashboard)/(overview)/page.tsx     # root route `/` — the fleet dashboard (Phase 6). The
  /(dashboard)/(overview)/loading.tsx  # (overview) group scopes the dashboard skeleton to `/`
                                # only; at the (dashboard) root it would be the first loading
                                # boundary for every sibling route and flash on /reports, /settings
  /(dashboard)/reports/page.tsx # reports hub — download cards, role-aware (Phase 6)
  /(dashboard)/notifications/{page,loading}.tsx  # the user's notifications, paginated, All/Unread
                                # filter; the bell's "View all" target, no sidebar entry (Phase 7)
  /(auth)/login/page.tsx        # Phase 2
  /(dashboard)/layout.tsx       # requireSession() + <AppShell> — added Phase 3 so pages stop
                                 # each wrapping themselves in AppShell individually
  /(dashboard)/settings/layout.tsx   # + requireRole(["admin"]) + SettingsNav sub-nav (Phase 3)
  /(dashboard)/settings/{categories,locations,departments,vendors,conditions,statuses,users}/
                                 # lookup-table CRUD (Phase 3) — page.tsx + a client *Manager.tsx
  /(dashboard)/assets/           # Phase 4, renders inside the same (dashboard) group — page.tsx
                                # (list), new/page.tsx (create), [id]/page.tsx (detail),
                                # [id]/edit/page.tsx, [id]/label/page.tsx (print view — stays
                                # inside the group; print chrome is suppressed via print:hidden
                                # on AppShell's Sidebar/Topbar, not by opting the route out of it)
  /403/page.tsx                 # target of lib/auth/session.ts's requireRole() (Phase 2)
  /api/...                     # route handlers, one folder per resource (REST-ish, kebab-case
                                # plural nouns even where the UI groups routes under /settings —
                                # e.g. /api/asset-conditions, not /api/settings/asset-conditions)
  /api/health/route.ts          # DB connectivity check (Phase 1)
  /api/auth/{login,logout}/route.ts   # Phase 2
  /api/users/route.ts           # GET-only in Phase 2 (RBAC/dept-scoping proof); POST added Phase 3
  /api/users/[id]/route.ts      # PATCH: edit, or {isActive} to deactivate/reactivate (Phase 3)
  /api/assets/route.ts          # GET (filtered/paginated list) + POST (multipart/form-data —
                                # fields plus an optional image share one request) (Phase 4)
  /api/assets/[id]/route.ts     # GET/PATCH (PATCH also multipart, can replace the image) (Phase 4)
  /api/assets/[id]/image/route.ts   # GET — serves the image from disk; base path itself is
                                # never exposed via a static public dir (Phase 4)
  /api/assets/[id]/attachments/route.ts               # GET/POST (Phase 4)
  /api/assets/[id]/attachments/[attachmentId]/route.ts        # DELETE (Phase 4)
  /api/assets/[id]/attachments/[attachmentId]/file/route.ts   # GET, serves from disk (Phase 4)
  /api/assets/[id]/route.ts     # DELETE added Phase 5 — admin-only soft delete
  /api/assets/[id]/{transfer,condition,status,dispose}/route.ts   # POST, lifecycle actions (Phase 5)
  /api/assets/[id]/maintenance/route.ts               # GET/POST (Phase 5)
  /api/assets/[id]/maintenance/[maintenanceId]/route.ts       # PATCH (Phase 5)
  /api/assets/[id]/dispose/attachment/route.ts        # GET, serves the disposal document (Phase 5 fix)
  /api/reports/{asset-register,audit-trail,disposal-register,depreciation}/route.ts
                                # GET, exceljs workbook as Content-Disposition: attachment.
                                # asset-register/audit-trail: every role (viewer dept-scoped in the
                                # query); disposal-register/depreciation: admin + asset_manager (Phase 6)
  /api/notifications/route.ts   # GET, session user's own only (limit/offset/unread=1) (Phase 7)
  /api/notifications/[id]/route.ts        # PATCH {isRead} (Phase 7)
  /api/notifications/read-all/route.ts    # POST (Phase 7)
  /api/cron/notifications-check/route.ts  # POST, no session — Bearer CRON_SECRET (constant-time
                                # compare; 503 if unset). Every /api/cron/* route follows this
                                # pattern. Called by scripts/run-notifications-check.ps1 (Phase 7)
/components
  providers.tsx                # ThemeProvider (next-themes) + TanStack QueryClientProvider
  /ui/                         # shadcn-style primitives: button, input, select, dialog, sheet,
                                # table, badge, dropdown-menu, card, skeleton, toast, tabs
                                # (Tabs added Phase 4, used by the asset detail page's four tabs);
                                # DropdownMenu extended with DropdownMenuCheckboxItem (Phase 4);
                                # DatePicker — hand-rolled (no Radix date primitive exists, no new
                                # dependency): ISO "YYYY-MM-DD" string in/out, replaces every native
                                # <input type="date">; renders inline (NOT portaled — anything
                                # portaled outside a Radix Dialog is inert/dismisses it) (Phase 5 fix)
  /shared/                     # cross-module components: TreePicker, EmptyState (Phase 3);
                                # MultiSelectFilter — checkbox dropdown built on
                                # DropdownMenuCheckboxItem, since no Radix Popover/Combobox is in
                                # the fixed dependency set (Phase 4); ConfirmDialog — generic
                                # confirm/prompt dialog, `description` renders via
                                # `DialogDescription asChild` into a <div> (not Radix's default
                                # <p>) so it can carry block content like a note textarea (Phase 5)
  /assets/                     # AssetsList, AssetForm, AssetDetail, AssetAttachments,
                                # AssetQrCode (server component), UserTypeahead (Phase 4);
                                # TransferDialog/ConditionDialog/StatusDialog/DisposalDialog,
                                # AuditLogTimeline, MaintenanceTab, AssetRowActions (list row's
                                # View/Edit/Transfer/Dispose DropdownMenu) (Phase 5)
  /dashboard/                  # StatTile, BarBreakdown (hand-rolled CSS bars, no chart library),
                                # WarrantyExpiringCard (client, window toggle), RecentActivityCard,
                                # InRepairCard (Phase 6)
  /reports/                    # ReportCard, AuditTrailReportCard (date-range options) (Phase 6)
  /notifications/              # NotificationBell (Topbar), NotificationItem (shared row),
                                # NotificationsList (/notifications page) (Phase 7)
  /auth/                        # LoginForm etc. (Phase 2)
  /layout/                     # AppShell, Sidebar, Topbar, SettingsNav, ThemeToggle, UserMenu, nav-items
                                # (Sidebar/Topbar take a className prop so AppShell can pass
                                # print:hidden — Phase 4)
/lib
  utils.ts                     # cn() helper (clsx + tailwind-merge) used by every ui primitive
  tree.ts                      # buildTree/flattenForSelect/collectDescendantIds — shared by every
                                # self-referencing lookup table (categories, locations) (Phase 3)
  badgeVariants.ts              # shared status/condition -> Badge variant map, per
                                # itam-design-system's "define once, not per-component" rule
                                # (Phase 4)
  format.ts                    # formatCurrency() — KES via Intl.NumberFormat (en-KE); every
                                # money value in the schema is KES, no currency column (Phase 4);
                                # formatRelativeTime() (Phase 6)
  /reports/                    # workbook builders, one per report (reports.ts), shared exceljs
                                # helpers (workbook.ts — styled header, KES/date formats, download
                                # response), the pure straight-line formula (depreciation.ts) and
                                # query-string parsing (params.ts) (Phase 6)
  /files/upload.ts              # disk upload helpers: assertValidImage/assertValidAttachment,
                                # saveAssetImage/saveAssetAttachment, deleteUploadedFile,
                                # resolveUploadedFilePath, mimeTypeForPath (Phase 4);
                                # saveAssetDisposalAttachment (Phase 5)
  /hooks/useSyncOnOpen.ts       # resets a Dialog's form to current values when it reopens, via
                                # render-time state adjustment rather than useEffect (this repo's
                                # eslint config flags synchronous setState-in-effect) (Phase 5)
  /hooks/useNotifications.ts    # TanStack Query hooks for the bell + page; shared ["notifications"]
                                # key prefix, 60 s poll + refetch on focus (Phase 7)
  /notifications/triggers.ts    # every notification rule: scheduleAssetChangeNotifications() (runs
                                # in next/server after(), post-commit) and runScheduledChecks()
                                # (warranty_expiring, maintenance_due, email retry) (Phase 7)
  /db/                         # pg pool + query functions, one file per table/domain;
                                # refCheck.ts's assertNotReferencedByAssets() guards every lookup
                                # table's DELETE against a live asset FK (Phase 3); query.ts
                                # gained isForeignKeyViolation() alongside isUniqueViolation()
                                # (Phase 4); assets.ts also does the audit-log diffing on update,
                                # not a separate module (Phase 4); dates.ts's toIsoString()/
                                # toDateOnlyString() (Phase 4) — every mapper with a date/
                                # timestamp column MUST normalize through one of these (pg
                                # returns DATE/TIMESTAMPTZ as native Date objects, which survive
                                # unconverted into a Server Component that calls lib/db directly
                                # instead of going through an API route's JSON.stringify; the
                                # DATE case is also timezone-sensitive — see dates.ts's comment).
                                # assets.ts's updateAsset() full-form-edit body was extracted into
                                # a shared updateAssetInternal()/patchAssetFields() so the
                                # dedicated lifecycle actions (transferAsset/changeAssetCondition/
                                # changeAssetStatus/softDeleteAsset) reuse the same field-diffing
                                # audit-log logic instead of a second write path; mapAsset/
                                # SELECT_COLUMNS/AssetRow now exported for disposals.ts to reuse
                                # (Phase 5). auditLog.ts (listAuditLogForAsset,
                                # findStatusBeforeMostRecentInRepair — the latter resolves the
                                # maintenance module's "restore prior status" prompt purely from
                                # the unified audit log, no schema change), maintenance.ts,
                                # disposals.ts (Phase 5). dashboard.ts (widget aggregates),
                                # reports.ts (full-dataset export queries, lookups resolved in SQL),
                                # systemSettings.ts (getSetting/getWarrantyWindows) (Phase 6) —
                                # every one takes the requester and scopes viewers in SQL;
                                # assets.ts now exports buildAssetFilterClause/RELATIONS_JOIN for
                                # reports.ts to reuse. notifications.ts (Phase 7); updateAsset()/
                                # transferAsset() return AssetChange {before, after} so triggers
                                # diff the locked pre-update row (Phase 7)
  /auth/                       # jose session helpers (session.ts, session-context.tsx), password
                                # hashing; api.ts's getApiSession()/requireApiRole() is the route-
                                # handler counterpart (401/403 JSON, not a redirect) (Phase 3)
  /validation/                 # request payload schemas (hand-rolled — no zod in the fixed deps);
                                # helpers.ts holds the small shared field-validation primitives;
                                # assets.ts also exports assetInputFromFormData() since the asset
                                # form posts multipart, not JSON (Phase 4); assetLifecycle.ts —
                                # transfer/maintenance/disposal validators (condition/status
                                # changes are simple enough to validate inline in their routes)
                                # (Phase 5)
  /email/                      # graphClient.ts (MSAL client-credentials token, isEmailConfigured),
                                # sendEmail.ts (Graph sendMail), templates.ts (single/digest HTML,
                                # appUrl()). Email is always best-effort and never inside an asset
                                # transaction (Phase 7)
/scripts/seed-admin.ts          # first-admin bootstrap, npm run seed:admin (Phase 2)
/scripts/seed-demo.ts           # re-runnable demo data (14 DEMO-* assets + maintenance/disposal/
                                # audit rows), npm run seed:demo; only ever deletes DEMO-* tags (Phase 6)
/scripts/run-notifications-check.ps1  # thin Task Scheduler trigger for /api/cron/notifications-check;
                                # its comment-based help holds the server setup steps (Phase 7)
/store                         # zustand stores (index.ts holds useUIStore: mobileNavOpen + the
                                # toasts slice backing components/ui/Toast.tsx; add slices, not
                                # new stores)
/types                         # shared TypeScript types (mirror schema.sql tables) — populated
                                # from Phase 3 on for shapes used across lib/db, API routes, and
                                # multiple components; narrow/local types (e.g. AuthUser) stay in
                                # their lib/db file instead; asset.ts/assetAttachment.ts added
                                # Phase 4
/schema/schema.sql              # source of truth for DB structure (lives in .claude/skills/schema/)
/schema/migrations/NNN_*.sql    # idempotent changes for existing DBs (from Phase 7), see
                                # itam-schema-reference "Schema changes"
/docs                          # flow docs, ERD notes
```

## Naming

- DB tables/columns: `snake_case` (matches `schema/schema.sql`).
- TypeScript types/interfaces: `PascalCase`, field names `camelCase` — map explicitly at the
  `lib/db` boundary (no auto-casing magic). E.g. `asset_tag` (DB) ↔ `assetTag` (TS).
- API routes: REST-ish, plural resource nouns — `/api/assets`, `/api/assets/[id]`,
  `/api/assets/[id]/audit-log`, `/api/categories`, etc.
- Components: `PascalCase.tsx`. Hooks: `useThing.ts`.

## Environment variables (`.env`)

```
DATABASE_URL=postgres://...
JWT_SECRET=...
ASSET_FILES_BASE_PATH=D:\itam-files          # Windows server disk path for images/attachments
MSAL_CLIENT_ID=...
MSAL_CLIENT_SECRET=...
MSAL_TENANT_ID=...
NOTIFICATION_FROM_EMAIL=...                  # sender mailbox; app needs Graph Mail.Send (application)
NOTIFICATION_EMAIL_ENABLED=true              # false = in-app only; dev/staging kill switch (Phase 7)
CRON_SECRET=...                              # shared secret required by /api/cron/* routes
ITAM_APP_URL=https://itam.internal.example   # base URL for email links + what the scheduled script calls
```

The Task Scheduler host side doesn't read `.env`: `scripts/run-notifications-check.ps1` takes
`-AppUrl` (or `$env:ITAM_APP_URL`) and reads the secret from an ACL-restricted file
(`C:\ProgramData\ITAM\cron-secret.txt`) or `$env:ITAM_CRON_SECRET`. Its value must equal the
app's `CRON_SECRET`.

`ASSET_FILES_BASE_PATH` is the root directory for all uploaded files. `assets.image_path` and
`asset_attachments.file_path` store paths **relative** to this root — never store absolute
paths in the DB, so the base path can move between environments without a data migration.

## Coding standards

- Server-side DB access only ever happens in route handlers or server components — never
  expose `pg` to client components.
- Every mutating API route that touches an `assets` row must also write the corresponding
  `asset_audit_log` entry in the same transaction (see `docs/asset-lifecycle-flow.md`).
- Use parameterized queries always (`pg` placeholders `$1, $2...`) — never string-concatenate
  SQL.
- All list endpoints support pagination (`limit`/`offset` or cursor) — assets tables will grow.
- Prefer server components for initial page data; use TanStack Query for client-side
  mutations/refetches (e.g. after a transfer action in a modal).

## Execution model

Per the project guidelines: use a higher-effort model (Opus) for planning/exploration and a
faster model (Sonnet) for executing the already-decided phase instructions. Each `phase-*`
skill is written to be self-contained and executable without re-deriving design decisions —
if something is ambiguous, that's a signal the skill file needs to be improved, not that the
executing agent should improvise architecture.

## Related skills

- [[itam-schema-reference]] — schema deep-dive, referenced by every phase touching the DB
- [[itam-design-system]] — shadcn/ui look-and-feel rules
- `docs/asset-lifecycle-flow.md` — state machine every asset-mutating endpoint must respect
- `skills/phase-1-foundation` through `skills/phase-8-polish` — ordered execution phases
