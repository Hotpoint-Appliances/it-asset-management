-- 009 — equipment_issue_forms.user_comments
--
-- Why: the recipient can leave an optional comment when acknowledging a form. It's written when
-- they sign, so like the signature it isn't part of the form's content hash. NULL means they left
-- none, which is displayed as "No user comments" on signed forms; nothing needs backfilling.
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/009_issue_form_user_comments.sql

ALTER TABLE equipment_issue_forms ADD COLUMN IF NOT EXISTS user_comments TEXT;
