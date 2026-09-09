---
name: phase-2-auth
description: Phase 2 — JWT session auth with jose, password hashing with bcryptjs, and the simple 3-tier RBAC (admin / asset_manager / viewer). Depends on phase-1-foundation.
---

# Phase 2 — Authentication & RBAC

Prerequisite skills: [[itam-conventions]], [[itam-schema-reference]]. Depends on
`phase-1-foundation` being complete (DB pool, app shell).

Before starting the Steps below, run [[phase-completion-check]] against `phase-1-foundation`'s
exit criteria.

## Objective

Working login/logout, session persistence via signed JWT (no server-side session table), and
role-based access control enforced at the route/middleware level using the 3-tier `roles`
table (admin, asset_manager, viewer).

## Steps

1. **Password hashing**: `lib/auth/password.ts` — `hashPassword`/`verifyPassword` wrapping
   `bcryptjs`.
2. **JWT session**: `lib/auth/session.ts` using `jose` — sign a JWT containing `{ userId,
   roleId, roleName, departmentId }` on login, store it in an `httpOnly`, `secure`, `sameSite:
   strict` cookie. Provide `getSession()` (server-side, reads/verifies cookie) and
   `requireSession()` (throws/redirects if absent or expired).
3. **Login flow**: `/app/(auth)/login/page.tsx` + `POST /api/auth/login` — verify credentials
   against `users.password_hash`, check `is_active`, set the session cookie, update
   `users.last_login_at`.
4. **Logout**: `POST /api/auth/logout` clears the cookie.
5. **RBAC middleware**: `middleware.ts` (or per-route guards) enforcing:
   - `admin` — full access, including `/users`, `/settings`, lookup-table management.
   - `asset_manager` — create/edit/transfer/dispose assets across all departments; no user
     management, no system settings.
   - `viewer` — read-only, and scoped to their own `department_id` (server-side query filter,
     not just UI hiding — enforce in `lib/db` query functions by accepting the requesting
     user's role/department and applying a `WHERE department_id = $1` clause for viewers).
6. **Route protection**: unauthenticated users redirect to `/login`; authenticated users
   without sufficient role get a 403 page, not a silent empty state.
7. **User context**: expose the current session (user id, name, role, department) to client
   components via a small server-provided context (e.g. a root layout fetch + React context),
   not a client-side JWT decode.

7. **Initial admin seed script** — `scripts/seed-admin.ts` (run via `npm run seed:admin`),
   creates the first admin user from env vars or interactive CLI prompts (name, email,
   password — hashed via `lib/auth/password.ts` before insert). This is the confirmed way the
   first admin account gets created on a fresh deployment — no in-app setup wizard. Document
   the command in deployment notes; never commit real credentials.

## Exit criteria

- Login/logout works end-to-end with an admin user created via `scripts/seed-admin.ts`.
- Viewer-role requests are provably scoped to their own department at the query layer (test
  with two users in different departments).
- Unauthenticated access to any `/app/(dashboard)/*` route redirects to `/login`.

## Produces (for later phases to reference)

- `lib/auth/{password,session}.ts`
- `middleware.ts`
- `/api/auth/{login,logout}/route.ts`
- `scripts/seed-admin.ts`
- Session/role context available to every later phase's pages and API routes

## Related skills

- [[itam-schema-reference]] — `roles`, `users` tables
- `skills/phase-3-core-data` — first phase to build admin-only management pages gated by this RBAC
