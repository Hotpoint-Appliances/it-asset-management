-- 008 — equipment_issue_forms.specifications
--
-- Why: an admin or asset manager now records the equipment's specifications on every issue form.
-- Like the other printed fields it's frozen when the form is triggered.
--
-- Forms that already exist are backfilled with 'Not specified'. The app won't offer that value as
-- a prefill for the next form (see UNRECORDED_SPECIFICATIONS in lib/issueForms/rules.ts).
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/008_issue_form_specifications.sql

BEGIN;

ALTER TABLE equipment_issue_forms ADD COLUMN IF NOT EXISTS specifications TEXT;
UPDATE equipment_issue_forms SET specifications = 'Not specified' WHERE specifications IS NULL;
ALTER TABLE equipment_issue_forms ALTER COLUMN specifications SET NOT NULL;

COMMIT;
