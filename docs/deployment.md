# Deployment runbook (Windows Server)

How the IT Asset Manager runs in production, and what to check after each deployment. The layout
is **nginx (HTTPS, company certificate) → PM2 cluster running `next start` → PostgreSQL**, all
on one Windows Server host, plus a Task Scheduler job for the daily notification check.

```
browser ──HTTPS──▶ nginx :443 ──HTTP──▶ PM2 cluster (2 × next start, 127.0.0.1:3000) ──▶ PostgreSQL
                     │                                   ▲
                     └ login rate limit, 12 MB uploads    └── Task Scheduler 07:00:
                                                              run-notifications-check.ps1 → 127.0.0.1:3000
```

Templates in this repo: `deploy/ecosystem.config.js` (PM2), `deploy/nginx-itam.conf` (nginx),
`scripts/run-notifications-check.ps1` (scheduled check; its help block has the Task Scheduler
steps), `.env.example` (every environment variable).

## 1. Prerequisites

| What | Notes |
| --- | --- |
| Node.js | **24 LTS** (what development uses). Not just Next's 20.9 minimum: `npm run seed:admin` / `seed:demo` run `.ts` files through Node's built-in TypeScript support, which needs 22.18 or newer. |
| PostgreSQL | Any supported version; the app's role needs normal read/write on its own database. |
| nginx for Windows | The official build is documented as beta quality (`select()`-based, ~1,024 connections). That's ample for an internal tool; IIS is the native alternative if ops ever prefer it. |
| PM2 | `npm install -g pm2`. |
| A service wrapper | Neither nginx nor PM2 installs as a Windows service by itself. See section 6. |
| Files folder | e.g. `D:\itam-files` (`ASSET_FILES_BASE_PATH`): asset images and attachments. The account PM2 runs as needs modify rights; nobody else does. **Back it up with the database**: the DB stores only paths relative to it. |
| Company TLS certificate | Full chain + private key, for nginx. |

## 2. Environment

Put production values in `.env.local` in the app folder (git-ignored). `next start` reads it in
production, and so do the seed scripts (`scripts/seed-admin.ts` reads only this file), so one
file serves both. Restrict its ACL to the app account and Administrators, since it holds every secret.
Every variable is listed in `.env.example`:

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | `postgres://itam:<password>@localhost:5432/itam` |
| `PG_POOL_MAX` | Optional. Connections per worker (default 10). Keep `instances × PG_POOL_MAX` below Postgres's `max_connections` (default 100). |
| `JWT_SECRET` | Long random value. Changing it signs everyone out. |
| `ASSET_FILES_BASE_PATH` | e.g. `D:\itam-files` |
| `MSAL_CLIENT_ID` / `MSAL_CLIENT_SECRET` / `MSAL_TENANT_ID` | The Azure app registration with the Graph **Mail.Send** application permission. |
| `NOTIFICATION_FROM_EMAIL` | The sender mailbox. |
| `NOTIFICATION_EMAIL_ENABLED` | Unset or `true` in production. `false` only on dev/staging copies whose users are real people. |
| `CRON_SECRET` | Long random value; must equal the content of `C:\ProgramData\ITAM\cron-secret.txt` (see the script's help). |
| `ITAM_APP_URL` | The **public HTTPS URL**, e.g. `https://itam.hotpoint.example`. QR labels and email links are built from it. |

Generate secrets with a CSPRNG, e.g.
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Env changes take effect on the next `pm2 reload itam`.

### Restrict the Graph permission

`Mail.Send` as an *application* permission lets the app send as **any mailbox in the tenant**.
Limit it to the sender mailbox with an Exchange Online application access policy (Exchange admin,
`New-ApplicationAccessPolicy -AccessRight RestrictAccess -AppId <MSAL_CLIENT_ID>
-PolicyScopeGroupId <mail-enabled security group containing only the sender mailbox>`), then
confirm with `Test-ApplicationAccessPolicy`.

## 3. HTTPS is required, not optional

The session cookie is set with `Secure` whenever `NODE_ENV=production` (which `next start`
implies). Browsers drop `Secure` cookies on plain HTTP, so **login silently fails over HTTP**: the
sign-in request succeeds but the next page bounces back to `/login`. Always browse through nginx's
HTTPS URL. nginx redirects port 80 to 443.

## 4. Database

- **Fresh install**: `psql "<DATABASE_URL>" -f schema/schema.sql` (it already contains every
  migration).
- **Existing database**: apply every `schema/migrations/NNN_*.sql` newer than the database, in
  number order, *before* starting the new build: `psql "<DATABASE_URL>" -f schema/migrations/001_notifications_dedupe_key.sql`.
  Each script is idempotent (safe to re-run) and its header explains what it changes.
- Record which migrations each environment has had applied (the ops notes are fine; there's no
  migration table).

## 5. First deployment

From an elevated PowerShell in the app folder (e.g. `C:\ITAM\app`, a checkout of `main`):

```powershell
npm ci
npm run build
# Schema, then the first admin (prompts for anything not in SEED_ADMIN_NAME/_EMAIL/_PASSWORD)
psql "<DATABASE_URL>" -f schema/schema.sql
npm run seed:admin
# Start the cluster (2 workers by default; set ITAM_PM2_INSTANCES to change)
pm2 start deploy/ecosystem.config.js
pm2 save
```

nginx: copy `deploy/nginx-itam.conf` to `C:\nginx\conf\itam.conf`, set `server_name` and the
certificate paths, `include` it from `nginx.conf`'s `http { }` block, then `nginx -t` and start
or reload nginx.

Scheduled notifications: follow `Get-Help .\scripts\run-notifications-check.ps1 -Full` (secret
file + ACL, a manual test, `Register-ScheduledTask`). Use `-AppUrl http://127.0.0.1:3000`: it
skips nginx, DNS and certificate trust, and the secret never leaves the host. nginx also returns
404 for `/api/cron/*` from outside.

## 6. Running nginx and PM2 as services (recommended: NSSM)

Both must start at boot and keep running with nobody logged in. Ops may already have a standard
way to do this. If not, **NSSM** (the Non-Sucking Service Manager, nssm.cc) is recommended:

- **What it does**: wraps any executable as a real Windows service. It starts it at boot, restarts
  it if it exits, captures stdout/stderr to log files, and runs under the account you choose,
  with nobody logged in.
- **Why it's needed**: `nginx.exe` and `pm2` are ordinary console programs on Windows. Started
  from a terminal, they die at logoff and don't come back after a reboot. NSSM is a single
  small, widely used executable that turns both into managed services the same way.

```powershell
# nginx
nssm install ITAM-nginx C:\nginx\nginx.exe
nssm set ITAM-nginx AppDirectory C:\nginx
nssm set ITAM-nginx Start SERVICE_AUTO_START

# PM2: keep its state in a machine-wide folder (not a user profile) and resurrect the saved
# process list at service start. The app account must own C:\ProgramData\pm2.
[Environment]::SetEnvironmentVariable('PM2_HOME', 'C:\ProgramData\pm2', 'Machine')
nssm install ITAM-pm2 "C:\Program Files\nodejs\node.exe" "<global npm prefix>\node_modules\pm2\bin\pm2-runtime" resurrect
nssm set ITAM-pm2 AppDirectory C:\ITAM\app
nssm set ITAM-pm2 AppEnvironmentExtra PM2_HOME=C:\ProgramData\pm2
nssm set ITAM-pm2 Start SERVICE_AUTO_START
```

`pm2-runtime` stays in the foreground, which is what a service wrapper needs. Run `pm2 save`
(with the same `PM2_HOME`) whenever the process list changes. Find the global prefix with
`npm prefix -g`.

## 7. Upgrades

1. Back up the database **and** the files folder.
2. `git pull` (or deploy the new build folder), `npm ci`, `npm run build`.
3. Apply any new `schema/migrations/*.sql` in order.
4. `pm2 reload itam` (rolling, no downtime with 2+ workers).
5. Run the sign-off checklist below.

## 8. Post-deployment sign-off checklist

Run after the first deployment and after each upgrade. Record the result in the ops notes.

- [ ] `curl http://127.0.0.1:3000/api/health` on the server → `{"status":"ok","db":"connected"}`.
- [ ] `https://<host>/` loads with the company certificate (no browser warning); `http://` redirects to `https://`.
- [ ] Log in over HTTPS; the dashboard loads. A redirect's `Location` uses `https://`.
- [ ] Upload an asset image of ~4 MB (proves `client_max_body_size`); an attachment of ~9 MB.
- [ ] Six wrong passwords in a row → the sixth or later shows "Too many sign-in attempts" (nginx `limit_req`).
- [ ] `https://<host>/api/cron/notifications-check` from another machine → 404.
- [ ] `psql` → `\d notifications` shows `dedupe_key`, i.e. migration 001 is applied (repeat for newer migrations).
- [ ] Assign an asset to a test user with a real mailbox: the `asset_assigned` email arrives, and its link opens the asset over HTTPS. (Phase 7 never verified an event email in a real inbox.)
- [ ] `Start-ScheduledTask -TaskPath '\ITAM\' -TaskName 'ITAM Notifications Check'`; `Get-ScheduledTaskInfo` shows `LastTaskResult` 0, and the log's last line starts `OK`.
- [ ] Reboot the server once (first deployment only): nginx, PM2 and the app come back without anyone logging in.
- [ ] Record: host, PM2 instance count, scheduled time and account, migrations applied.
