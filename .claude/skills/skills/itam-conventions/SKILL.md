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
                                # separate homepage; Phase 2 adds the auth gate in front of it)
  /(auth)/login/page.tsx        # Phase 2
  /(dashboard)/dashboard/page.tsx
  /(dashboard)/assets/...
  /403/page.tsx                 # target of lib/auth/session.ts's requireRole() (Phase 2)
  /api/...                     # route handlers, one folder per resource
  /api/health/route.ts          # DB connectivity check (Phase 1)
  /api/auth/{login,logout}/route.ts   # Phase 2
  /api/users/route.ts           # GET-only in Phase 2 (RBAC/dept-scoping proof); Phase 3 extends it
/components
  providers.tsx                # ThemeProvider (next-themes) + TanStack QueryClientProvider
  /ui/                         # shadcn-style primitives (button, input, dialog, table, ...)
  /assets/                     # asset-specific components
  /auth/                        # LoginForm etc. (Phase 2)
  /layout/                     # AppShell, Sidebar, Topbar, ThemeToggle, UserMenu, nav-items
/lib
  utils.ts                     # cn() helper (clsx + tailwind-merge) used by every ui primitive
  /db/                         # pg pool + query functions, one file per table/domain
  /auth/                       # jose session helpers (session.ts, session-context.tsx), password hashing
  /validation/                 # request payload schemas (hand-rolled — no zod in the fixed deps)
  /email/                      # msal-node + Graph email senders
/scripts/seed-admin.ts          # first-admin bootstrap, npm run seed:admin (Phase 2)
/store                         # zustand stores (index.ts holds useUIStore; add slices, not new stores)
/types                         # shared TypeScript types (mirror schema.sql tables)
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
