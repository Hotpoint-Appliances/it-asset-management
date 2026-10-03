# IT Asset Manager

Internal tool for tracking Hotpoint's IT assets through their whole life: registration with QR
labels, assignment and transfers, condition/status changes, maintenance, disposal, a full audit
trail, dashboard and Excel reports, and in-app + email notifications (warranty expiry,
maintenance due, assignments).

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL via `pg` (raw SQL, no ORM) · JWT
sessions (`jose`) · Tailwind + Radix (shadcn-style) · TanStack Query · Zustand · `exceljs` ·
Microsoft Graph email via `@azure/msal-node`.

Roles: **admin** (everything, incl. users and settings), **asset_manager** (all asset actions,
all departments), **viewer** (read-only, own department only).

## Local development

Requires Node 24 and a local PostgreSQL.

```bash
npm install
cp .env.example .env.local        # then fill it in (see the comments in the file)
psql "$DATABASE_URL" -f schema/schema.sql
npm run seed:admin                # first admin account (prompts for name/email/password)
npm run seed:demo                 # optional: 14 DEMO-* assets with history, re-runnable
npm run dev                       # http://localhost:3000
```

Set `NOTIFICATION_EMAIL_ENABLED=false` in `.env.local` whenever the database contains real people,
so notifications stay in-app and nobody gets test email.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint (kept at zero warnings) |
| `npx tsc --noEmit` | Typecheck |
| `npm run format` | Prettier |

## Repository map

| Path | Contents |
| --- | --- |
| `app/` | Routes: `(dashboard)/` pages inside the app shell, `api/` route handlers |
| `components/` | `ui/` primitives, `shared/`, and one folder per feature |
| `lib/db/` | All SQL, one file per table/domain; the only place that touches `pg` |
| `lib/` | Auth, validation, email, notifications, reports, hooks |
| `schema/` | `schema.sql` (fresh install) and `migrations/` (numbered, for existing DBs) |
| `scripts/` | Seed scripts and the scheduled notification trigger (`run-notifications-check.ps1`) |
| `deploy/` | PM2 and nginx templates |
| `docs/deployment.md` | Production runbook and post-deployment checklist |
| `.claude/skills/` | Design/convention notes and the phase-by-phase build history |

## Deployment

See **[docs/deployment.md](docs/deployment.md)**: Windows Server, nginx (HTTPS) → PM2 cluster →
PostgreSQL, the scheduled notification task, and the sign-off checklist. HTTPS is required: the
session cookie is `Secure` in production.
