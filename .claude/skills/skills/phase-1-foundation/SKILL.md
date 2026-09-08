---
name: phase-1-foundation
description: Phase 1 — scaffold the Next.js 16 project, install the fixed dependency set, set up the Postgres connection, run the base schema, and build the themed app shell. Run this first, before any other phase.
---

# Phase 1 — Foundation

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].

## Objective

Produce a running Next.js 16 app with DB connectivity, theming, and an empty-but-navigable app
shell — the base every later phase builds pages into.

## Steps

1. **Scaffold**: `create-next-app` (latest v16, App Router, TypeScript, Tailwind, ESLint).
2. **Install dependencies** exactly as listed in [[itam-conventions]] — `jose`, `zustand`,
   `@tanstack/react-query`, `bcryptjs`, `axios`, `exceljs`, `lucide-react`, `next-themes`,
   `pg`, `@azure/msal-node`, plus `qrcode` for asset labels (used in Phase 4) and the Radix
   packages needed for the shadcn-style `/components/ui` primitives.
3. **Folder structure**: create the structure from [[itam-conventions]] (`/lib/db`,
   `/lib/auth`, `/lib/validation`, `/lib/email`, `/store`, `/types`, `/components/ui`,
   `/components/layout`).
4. **Env setup**: create `.env.example` with all variables from [[itam-conventions]]; do not
   commit real secrets. Read `DATABASE_URL` and `ASSET_FILES_BASE_PATH` at startup and fail
   fast with a clear error if missing.
5. **DB connection**: `lib/db/pool.ts` — a singleton `pg.Pool`. Add a `lib/db/query.ts` helper
   that wraps `pool.query` and a `withTransaction()` helper for multi-statement writes (needed
   by every audit-log-writing endpoint from Phase 4 onward).
6. **Run schema**: apply `schema/schema.sql` against the target database. Verify all tables,
   triggers, and seed rows (roles, asset_conditions, asset_statuses) exist.
7. **Theming**: wire `next-themes` `ThemeProvider` into the root layout; define the CSS
   variable tokens (light + dark) per [[itam-design-system]] in `globals.css`; add a theme
   toggle component.
8. **App shell**: build the sidebar + topbar shell described in [[itam-design-system]] with
   placeholder nav links (Dashboard, Assets, Categories, Locations, Departments, Users,
   Reports, Settings) — pages themselves are built in later phases, so these can 404 or show a
   "coming soon" placeholder for now. Build the shell responsive from the start per
   [[itam-design-system]]'s breakpoint rules (off-canvas sidebar below `md`, persistent above)
   — this is the one shell component every later phase's pages render inside, so its
   responsiveness can't be deferred to Phase 8.
9. **Base `/components/ui` primitives**: `Button`, `Input`, `Card`, `Badge`, `Skeleton` at
   minimum — enough for later phases to start building on immediately. Additional primitives
   (`Dialog`, `Table`, `DropdownMenu`, etc.) can be added in the phase that first needs them.
10. **TanStack Query provider** and **Zustand store scaffold** (`store/index.ts`) wired into
    the root layout.

## Exit criteria

- `npm run dev` serves the app shell with working theme toggle and empty nav.
- DB connection verified (a temporary `/api/health` route querying `SELECT 1` is acceptable,
  remove before Phase 8 polish or keep as a real health check — implementer's call).
- `schema/schema.sql` applied cleanly with no errors.
- No page-level functionality yet — that starts in Phase 2.

## Produces (for later phases to reference)

- `lib/db/pool.ts`, `lib/db/query.ts`
- `/components/ui/{Button,Input,Card,Badge,Skeleton}.tsx`
- `/components/layout/{Sidebar,Topbar,ThemeToggle}.tsx`
- `.env.example`
