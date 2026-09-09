---
name: phase-1-foundation
description: Phase 1 — scaffold the Next.js 16 project, install the fixed dependency set, set up the Postgres connection, run the base schema, and build the themed app shell. Run this first, before any other phase.
---

# Phase 1 — Foundation

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]], [[itam-design-system]].

No prior phase exists, so [[phase-completion-check]] is a no-op here — nothing to verify
beforehand.

## Objective

Produce a running Next.js 16 app with DB connectivity, theming, and an empty-but-navigable app
shell — the base every later phase builds pages into.

## Steps

1. **Scaffold**: `create-next-app` (latest v16, App Router, TypeScript, Tailwind, ESLint). Already
   done for this project (`package.json` has `next`/`react`/`react-dom` + Tailwind/ESLint/TS dev
   deps) — skip re-running it; verify it's actually there before assuming so, per
   [[phase-completion-check]]'s "verify against the real repo, not memory" rule.
2. **Install dependencies** exactly as listed in [[itam-conventions]] — `jose`, `zustand`,
   `@tanstack/react-query`, `bcryptjs`, `axios`, `exceljs`, `lucide-react`, `next-themes`,
   `pg`, `@azure/msal-node`, plus `qrcode` for asset labels (used in Phase 4) and the Radix
   packages needed for the shadcn-style `/components/ui` primitives.
3. **Folder structure**: create the structure from [[itam-conventions]] (`/lib/db`,
   `/lib/auth`, `/lib/validation`, `/lib/email`, `/store`, `/types`, `/components/ui`,
   `/components/layout`).
4. **Env setup**: create `.env.example` with all variables from [[itam-conventions]] (names only,
   placeholder values); do not commit real secrets. Create `.env.local` (gitignored) with real
   local dev values — see local dev setup below. Read `DATABASE_URL` and `ASSET_FILES_BASE_PATH`
   at startup and fail fast with a clear error if missing.

   **Local dev setup (this environment):** PostgreSQL runs locally (Windows install, not
   Docker). The database/role are created by the user running a `psql`/`createdb` command
   handed to them directly (not run by the agent), so the postgres superuser password never
   passes through the agent — confirm the resulting `DATABASE_URL` works (a simple `SELECT 1`
   connection test) before writing it into `.env.local`. `JWT_SECRET` and `CRON_SECRET` are
   auto-generated random values (`crypto.randomBytes(...).toString('hex')`) written straight to
   `.env.local` — real values aren't needed until Phase 2 (JWT) and the cron-triggered phases,
   but generating them now avoids a placeholder trap later. `ASSET_FILES_BASE_PATH` needs a real
   local Windows path that exists on disk (create it if missing) — ask the user if unspecified
   rather than guessing a path. MSAL/Graph vars stay as placeholders in both files until
   Phase 7 — not needed until then.
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

   **Root route (`/`) decision:** no separate marketing/landing page. `app/page.tsx` renders the
   app shell directly with a placeholder dashboard body (e.g. "Dashboard — coming soon" inside a
   `Card`). There is no auth yet in this phase, so the shell is unguarded — Phase 2 adds the
   login gate/redirect in front of this same shell rather than replacing it (as `proxy.ts` —
   Next.js 16 renamed `middleware.ts` to `proxy.ts`, see `phase-2-auth`'s Produces — plus a
   defense-in-depth check in the page itself). Do not build a distinct public homepage; it
   would be discarded once Phase 2's redirect logic lands.
9. **Base `/components/ui` primitives**: `Button`, `Input`, `Card`, `Badge`, `Skeleton` at
   minimum — enough for later phases to start building on immediately. Additional primitives
   (`Dialog`, `Table`, `DropdownMenu`, etc.) can be added in the phase that first needs them.
   Exception: `Sheet` (slide-over) is also needed in this phase, not deferred — the app shell's
   off-canvas mobile sidebar depends on it per [[itam-design-system]]'s responsive rules, and that
   shell can't ship non-responsive even temporarily.
10. **TanStack Query provider** and **Zustand store scaffold** (`store/index.ts`) wired into
    the root layout.

## Exit criteria

- `npm run dev` serves the app shell at `/` (no separate homepage) with working theme toggle and
  empty nav.
- DB connection verified (a temporary `/api/health` route querying `SELECT 1` is acceptable,
  remove before Phase 8 polish or keep as a real health check — implementer's call).
- `schema/schema.sql` applied cleanly with no errors.
- No page-level functionality yet — that starts in Phase 2.

## Produces (for later phases to reference)

- `lib/db/pool.ts`, `lib/db/query.ts` — singleton `pg.Pool` + `query()`/`withTransaction()`.
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge), used by every `/components/ui` primitive.
- `/components/ui/{Button,Input,Card,Badge,Skeleton,Sheet}.tsx` — shadcn-style primitives, styled
  via `class-variance-authority` where variants are needed (`Button`, `Badge`).
- `/components/layout/{Sidebar,SidebarNav,Topbar,ThemeToggle,AppShell,nav-items}.{tsx,ts}` —
  `AppShell` is the composed shell (`Sidebar` + `Topbar` + content) every page from Phase 2 onward
  renders inside; `nav-items.ts` is the single source of truth for the sidebar nav list later
  phases extend.
- `components/providers.tsx` — client component wrapping `ThemeProvider` (next-themes,
  `attribute="class"`) + `QueryClientProvider`; mounted once in `app/layout.tsx`.
- `store/index.ts` — Zustand `useUIStore` (currently just mobile-nav-open state; later phases
  add slices here rather than creating parallel stores).
- `app/api/health/route.ts` — `GET` health check querying `SELECT 1`.
- `app/page.tsx` — root route renders `AppShell` directly (see Root route decision above).
- `.env.example`, `.env.local` (gitignored — real local dev values, not committed).
production
  deployments point this at a real server path instead (e.g. `D:\itam-files`).
