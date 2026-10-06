-- 001 — notifications.dedupe_key (Phase 7)
--
-- Why: the daily scheduled check (warranty_expiring / maintenance_due, triggered by
-- scripts/run-notifications-check.ps1 via Windows Task Scheduler) re-evaluates the same assets
-- every day. Without a dedupe key the same alert would be inserted and emailed daily. The
-- trigger code inserts with ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
-- DO NOTHING, so a run is idempotent and safe to repeat manually.
--
-- Key formats (built in lib/notifications/triggers.ts):
--   warranty_expiring:<asset_id>:<warranty_expiry YYYY-MM-DD>:<window days>
--     (one alert per configured window crossing; a changed expiry date re-arms it)
--   maintenance_due:<asset_maintenance.id>
-- Event-driven types (asset_assigned / asset_transferred) leave it NULL: every event is new.
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/001_notifications_dedupe_key.sql

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_dedupe
  ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- The bell and /notifications page list a user's newest notifications first.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
