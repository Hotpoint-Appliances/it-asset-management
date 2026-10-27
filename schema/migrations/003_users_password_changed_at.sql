-- 003 — users.password_changed_at
--
-- Why: users can now change their own password from the user menu. Sessions are stateless JWTs
-- valid for 8h, so a changed password alone wouldn't sign out a browser that already has the old
-- session (e.g. one left signed in on a shared machine). `resolveSessionToken`
-- (lib/auth/session.ts) rejects any token issued before this timestamp; the browser that made the
-- change gets a freshly issued token and stays signed in. NULL = never changed, no tokens rejected.
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
