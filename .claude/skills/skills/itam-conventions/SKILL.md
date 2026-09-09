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
- Dev: Tailwind CSS, Prettier, TypeScript, ESLint
- UI pattern: shadcn/ui style (Radix primitives + Tailwind) — see `itam-design-system` skill
- Barcode/QR: `qrcode` (QR) for asset tag labels — see `phase-4-asset-management`

No ORM is introduced. All queries go through a thin `lib/db` query layer using `pg`.

## Folder structure

```
proxy.ts                        # Next.js 16 renamed middleware.ts to proxy.ts — auth-presence
                                 # redirect only (login gate), added in Phase 2
/app
  page.tsx                     # root route — renders AppShell directly (Phase 1 decision, no
                                # separate homepage; Phase 2 adds the auth gate in front of it).
                                # Deliberately NOT inside the (dashboard) group below — it did its
                                # own requireSession()+AppShell before that group existed and was
                                # left as-is rather than folded in for an unrelated refactor.
  /(auth)/login/page.tsx        # Phase 2
  /(dashboard)/layout.tsx       # requireSession() + <AppShell> — added Phase 3 so pages stop
                                 # each wrapping themselves in AppShell individually
  /(dashboard)/settings/layout.tsx   # + requireRole(["admin"]) + SettingsNav sub-nav (Phase 3)
  /(dashboard)/settings/{categories,locations,departments,vendors,conditions,statuses,users}/
                                 # lookup-table CRUD (Phase 3) — page.tsx + a client *Manager.tsx
  /(dashboard)/assets/...       # Phase 4, renders inside the same (dashboard) group
  /403/page.tsx                 # target of lib/auth/session.ts's requireRole() (Phase 2)
  /api/...                     # route handlers, one folder per resource (REST-ish, kebab-case
                                # plural nouns even where the UI groups routes under /settings —
                                # e.g. /api/asset-conditions, not /api/settings/asset-conditions)
  /api/health/route.ts          # DB connectivity check (Phase 1)
  /api/auth/{login,logout}/route.ts   # Phase 2
  /api/users/route.ts           # GET-only in Phase 2 (RBAC/dept-scoping proof); POST added Phase 3
  /api/users/[id]/route.ts      # PATCH: edit, or {isActive} to deactivate/reactivate (Phase 3)
/components
  providers.tsx                # ThemeProvider (next-themes) + TanStack QueryClientProvider
  /ui/                         # shadcn-style primitives: button, input, select, dialog, sheet,
                                # table, badge, dropdown-menu, card, skeleton, toast, ...
  /shared/                     # cross-module components: TreePicker, EmptyState (Phase 3)
  /assets/                     # asset-specific components
  /auth/                        # LoginForm etc. (Phase 2)
  /layout/                     # AppShell, Sidebar, Topbar, SettingsNav, ThemeToggle, UserMenu, nav-items
/lib
  utils.ts                     # cn() helper (clsx + tailwind-merge) used by every ui primitive
  tree.ts                      # buildTree/flattenForSelect/collectDescendantIds — shared by every
                                # self-referencing lookup table (categories, locations) (Phase 3)
  /db/                         # pg pool + query functions, one file per table/domain;
                                # refCheck.ts's assertNotReferencedByAssets() guards every lookup
                                # table's DELETE against a live asset FK (Phase 3)
  /auth/                       # jose session helpers (session.ts, session-context.tsx), password
                                # hashing; api.ts's getApiSession()/requireApiRole() is the route-
                                # handler counterpart (401/403 JSON, not a redirect) (Phase 3)
  /validation/                 # request payload schemas (hand-rolled — no zod in the fixed deps);
                                # helpers.ts holds the small shared field-validation primitives
  /email/                      # msal-node + Graph email senders
/scripts/seed-admin.ts          # first-admin bootstrap, npm run seed:admin (Phase 2)
/store                         # zustand stores (index.ts holds useUIStore: mobileNavOpen + the
                                # toasts slice backing components/ui/Toast.tsx; add slices, not
                                # new stores)
/types                         # shared TypeScript types (mirror schema.sql tables) — populated
                                # from Phase 3 on for shapes used across lib/db, API routes, and
                                # multiple components; narrow/local types (e.g. AuthUser) stay in
                                # their lib/db file instead
/schema/schema.sql              # source of truth for DB structure
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
NOTIFICATION_FROM_EMAIL=...
CRON_SECRET=...                              # shared secret required by /api/cron/* routes
ITAM_APP_URL=https://itam.internal.example   # base URL the scheduled PowerShell script calls
```

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
