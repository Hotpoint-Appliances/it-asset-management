-- 004 — password_reset_tokens
--
-- Why: users can reset a forgotten password from the sign-in page. /forgot-password emails a
-- single-use link valid for 30 minutes; only a SHA-256 hash of its token is stored, so a leaked
-- database (or backup) can't be used to reset anyone's password. Requesting a new link deletes
-- the user's earlier unused ones, and a successful reset stamps users.password_changed_at, which
-- signs the user out everywhere (migration 003).
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/004_password_reset_tokens.sql

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) UNIQUE NOT NULL, -- hex SHA-256 of the emailed token
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
