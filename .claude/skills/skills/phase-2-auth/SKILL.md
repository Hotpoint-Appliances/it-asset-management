---
name: phase-2-auth
description: Phase 2 — JWT session auth with jose, password hashing with bcryptjs, and the simple 3-tier RBAC (admin / asset_manager / viewer). Depends on phase-1-foundation.
---

# Phase 2 — Authentication & RBAC

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]]. Depends on
`phase-1-foundation` being complete (DB pool, app shell).

Before starting the Steps below, run [[phase-completion-check]] against `phase-1-foundation`'s
exit criteria. Doing so for this implementation found two real gaps — `.env.local`'s
`ASSET_FILES_BASE_PATH` pointed at a different machine's Windows username (stale, didn't exist
on disk), and `.env.example` had a real generated DB password committed into a setup comment
instead of a placeholder — both fixed before starting the Steps below. Everything else
(dependencies, DB connection, `schema.sql`, themed shell) verified clean.

## Objective

Working login/logout, session persistence via signed JWT (no server-side session table), and
role-based access control enforced at the route/middleware level using the 3-tier `roles`
table (admin, asset_manager, viewer).

## Steps

1. **Password hashing**: `lib/auth/password.ts` — `hashPassword`/`verifyPassword` wrapping
   `bcryptjs` (12 salt rounds).
2. **JWT session**: `lib/auth/session.ts` using `jose` — sign a JWT containing `{ userId,
roleId, roleName, departmentId, fullName, email }` on login (the extra `fullName`/`email`
   avoid a DB round-trip for the user-context step below), store it in an `itam_session`
   cookie: `httpOnly`, `secure` in production only (dev runs plain HTTP), `sameSite: strict`,
   8h expiry. Provide `getSession()` (reads/verifies the cookie, returns `null` — never
   redirects, so `proxy.ts` and defense-in-depth checks can both call it safely),
   `requireSession()` (redirects to `/login` if absent/invalid), and `requireRole(roles)`
   (calls `requireSession()` then redirects to `/403` if the role doesn't match) for later
   phases' admin-only pages to call.
3. **Login flow**: `app/(auth)/login/page.tsx` (Suspense-wrapped, reads a `?from=` redirect
   target) + `components/auth/LoginForm.tsx` (client component, posts via `axios`) +
   `POST /api/auth/login` — verify credentials against `users.password_hash`, check
   `is_active`, set the session cookie, update `users.last_login_at`. Payload validation is
   hand-rolled in `lib/validation/auth.ts` — `zod` is not in [[itam-conventions]]'s fixed
   dependency list, so this project doesn't use a schema library for it.
4. **Logout**: `POST /api/auth/logout` clears the cookie.
5. **RBAC — authentication vs. authorization split**: Next.js 16 deprecated and renamed
   `middleware.ts` to **`proxy.ts`** (see `node_modules/next/dist/docs`, per AGENTS.md) — this
   project's file is `proxy.ts` at the repo root, not `middleware.ts`. It does only the
   _optimistic authentication_ check Next's own auth guide recommends for this layer: redirect
   to `/login` when no session cookie is present, redirect away from `/login` when one is.
   Its `matcher` excludes `/api/*` entirely — route handlers verify their own session/role and
   return JSON 401/403, per the Route Handlers guidance in that same doc, rather than being
   redirected to an HTML login page.
   Full role-tier enforcement (the `admin`/`asset_manager`/`viewer` route policy below) is
   **not** encoded in `proxy.ts` — there are no admin-only pages yet to gate (`/users`,
   `/settings` are Phase 3+ deliverables). Instead this phase ships the reusable primitive
   (`requireRole()` above + `/app/403/page.tsx`) that Phase 3 onward calls from each admin-only
   page/layout as it's built:
   - `admin` — full access, including `/users`, `/settings`, lookup-table management.
   - `asset_manager` — create/edit/transfer/dispose assets across all departments; no user
     management, no system settings.
   - `viewer` — read-only, and scoped to their own `department_id` (server-side query filter,
     not just UI hiding — enforce in `lib/db` query functions by accepting the requesting
     user's role/department and applying a `WHERE department_id = $1` clause for viewers).
     Implemented and proven now in `lib/db/users.ts`'s `listUsers()` + a minimal **GET-only**
     `app/api/users/route.ts` — added ahead of Phase 3 specifically to make this exit criterion
     concretely testable (see Exit criteria below). Phase 3 should extend this route for full
     user CRUD rather than recreating it.
6. **Route protection**: unauthenticated users redirect to `/login` (via `proxy.ts`, plus a
   defense-in-depth `requireSession()` call directly in `app/page.tsx` — Next's auth guide
   recommends not relying on the proxy/middleware layer alone). Authenticated users without
   sufficient role get the `/403` page via `requireRole()`, not a silent empty state — the
   mechanism is in place and will be exercised for real once Phase 3 adds an admin-only page.
7. **User context**: `lib/auth/session-context.tsx` — a `SessionProvider` (client) +
   `useSession()` hook. `app/layout.tsx` (server component) calls `getSession()` and passes the
   result into `components/providers.tsx`, which mounts `SessionProvider` — so client
   components read the already-server-verified session, never decoding the JWT themselves.
   Consumed by `components/layout/UserMenu.tsx` (new — shows name/role, handles logout) and
   `SidebarNav.tsx` (nav items now carry an optional `roles` filter; `nav-items.ts`'s `Users`
   and `Settings` links are hidden from non-admins).
8. **Initial admin seed script** — `scripts/seed-admin.ts` (run via `npm run seed:admin`),
   creates the first admin user from env vars (`SEED_ADMIN_NAME`/`_EMAIL`/`_PASSWORD`) or
   interactive CLI prompts for whichever are missing, hashed via `lib/auth/password.ts` before
   insert. Runs under Node's native TypeScript execution (no `ts-node`/`tsx` dependency added,
   keeping the fixed dependency set intact) — this required adding
   `"allowImportingTsExtensions": true` to `tsconfig.json` so the script's relative import of
   `lib/auth/password.ts` can use an explicit `.ts` extension, which Node requires but `tsc`
   normally rejects. This is the confirmed way the first admin account gets created on a fresh
   deployment — no in-app setup wizard. Document the command in deployment notes; never commit
   real credentials.

## Exit criteria

- Login/logout works end-to-end with an admin user created via `scripts/seed-admin.ts` —
  verified live: seeded an admin, logged in, hit an authenticated route, logged out, confirmed
  the post-logout redirect. (No test runner is in the fixed dependency set, so this and the
  criteria below were verified with `curl` against the running dev server rather than an
  automated suite, matching Phase 1's precedent of no test framework.)
- Viewer-role requests are provably scoped to their own department at the query layer — proven
  by temporarily creating two departments and one viewer user in each, confirming
  `GET /api/users` returns only the requester's own department for both, then deleting that
  test data.
- Unauthenticated access to any protected route (verified on `/`, the only route Phase 1 built
  besides `/login`) redirects to `/login`; there's no literal `app/(dashboard)/*` route group
  yet since Phase 1 deliberately put the placeholder dashboard at `/` itself (see
  `phase-1-foundation`'s Root route decision) — `proxy.ts`'s matcher protects everything except
  `/login` and `/api/*`, so this holds for whatever routes Phase 3 onward adds under that same
  root, not just `/`.

## Produces (for later phases to reference)

- `lib/auth/password.ts` — `hashPassword`/`verifyPassword` (bcryptjs, 12 rounds).
- `lib/auth/session.ts` — jose-signed JWT in an `itam_session` cookie; `getSession()` /
  `requireSession()` / `requireRole(roles)`.
- `lib/auth/session-context.tsx` — `SessionProvider` + `useSession()`, fed by the root layout's
  server-side `getSession()` call.
- `lib/db/users.ts` — `findUserByEmail`, `touchLastLogin`, `listUsers()` (department-scoped for
  viewers) — the template later `lib/db/*.ts` files should follow for the same scoping rule.
- `lib/validation/auth.ts` — hand-rolled login payload validation.
- `proxy.ts` — Next 16's renamed `middleware.ts`; optimistic auth-presence redirect only,
  matcher excludes `/api/*`.
- `app/(auth)/login/page.tsx`, `components/auth/LoginForm.tsx`.
- `app/api/auth/{login,logout}/route.ts`.
- `app/api/users/route.ts` — minimal GET-only RBAC/department-scoping proof; extend, don't
  recreate, in Phase 3.
- `app/403/page.tsx` — target of `requireRole()`.
- `components/layout/UserMenu.tsx`, `components/ui/DropdownMenu.tsx` (new base primitive, added
  now per [[itam-design-system]]'s "add in the phase that first needs it" rule).
- `components/layout/nav-items.ts` / `SidebarNav.tsx` — `NavItem.roles` filter, applied via
  `useSession()`.
- `scripts/seed-admin.ts` (`npm run seed:admin`).
- `tsconfig.json` — `allowImportingTsExtensions: true` (see Step 8).
- Session/role context available to every later phase's pages and API routes.

## Related skills

- [[itam-schema-reference]] — `roles`, `users` tables
- `skills/phase-3-core-data` — first phase to build admin-only management pages gated by this RBAC
