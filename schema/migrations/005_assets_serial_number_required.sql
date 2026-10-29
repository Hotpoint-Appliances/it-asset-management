-- 005 — assets.serial_number required and unique
--
-- Why: every asset must carry its manufacturer serial number, and no two live assets may share
-- one (compared case-insensitively). Soft-deleted assets don't count, so a serial on a deleted
-- record can be entered again. The app enforces both rules too (lib/validation/assets.ts, the
-- Excel import); this makes them hold for anything that writes to the table.
--
-- Existing assets without a serial get the placeholder 'UNKNOWN-<asset tag>' (unique, because
-- tags are), so they can be found with a search for "UNKNOWN-" and corrected from the edit form.
-- The migration stops, changing nothing, if two live assets already share a serial; fix those
-- by hand first.
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/005_assets_serial_number_required.sql

BEGIN;

UPDATE assets SET serial_number = btrim(serial_number)
WHERE serial_number <> btrim(serial_number);

UPDATE assets SET serial_number = 'UNKNOWN-' || asset_tag
WHERE serial_number IS NULL OR serial_number = '';

DO $$
DECLARE
  dupes TEXT;
BEGIN
  SELECT string_agg(serial || ' (' || tags || ')', ', ') INTO dupes
  FROM (
    SELECT lower(serial_number) AS serial, string_agg(asset_tag, ', ' ORDER BY asset_tag) AS tags
    FROM assets WHERE deleted_at IS NULL
    GROUP BY lower(serial_number) HAVING count(*) > 1
  ) d;
  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION 'Serial numbers shared by more than one live asset: %', dupes;
  END IF;
END $$;

ALTER TABLE assets ALTER COLUMN serial_number SET NOT NULL;

ALTER TABLE assets DROP CONSTRAINT IF EXISTS chk_asset_serial_number;
ALTER TABLE assets ADD CONSTRAINT chk_asset_serial_number CHECK (btrim(serial_number) <> '');

CREATE UNIQUE INDEX IF NOT EXISTS uq_assets_serial_number_live
  ON assets (lower(serial_number)) WHERE deleted_at IS NULL;

COMMIT;
