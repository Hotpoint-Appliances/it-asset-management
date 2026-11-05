-- 006 — awaiting_disposal, faulty and beyond_repair statuses, fair condition
--
-- Why: the asset register import needs these values, and schema.sql only seeds them on fresh
-- installs. Statuses and conditions are admin-editable, so a database may already have them from
-- Settings, where names are stored as typed. A name counts as present whatever its case or
-- whether it uses spaces or underscores ("awaiting disposal", "Awaiting_Disposal"), the same
-- matching as statusKey in lib/badgeVariants.ts, and is left as it is.
--
-- New statuses go after the existing ones. A new fair condition goes just before bad, moving the
-- conditions from bad onward down one place; with no bad condition it goes last.
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/006_asset_status_condition_seeds.sql

BEGIN;

INSERT INTO asset_statuses (name, sort_order)
SELECT seed.name, (SELECT COALESCE(MAX(sort_order), 0) FROM asset_statuses) + seed.position
FROM (VALUES ('awaiting_disposal', 1), ('faulty', 2), ('beyond_repair', 3)) AS seed(name, position)
WHERE NOT EXISTS (
  SELECT 1 FROM asset_statuses s
  WHERE regexp_replace(lower(btrim(s.name)), '\s+', '_', 'g') = seed.name
);

DO $$
DECLARE
  bad_order INT;
BEGIN
  IF EXISTS (SELECT 1 FROM asset_conditions WHERE lower(btrim(name)) = 'fair') THEN
    RETURN;
  END IF;

  SELECT sort_order INTO bad_order FROM asset_conditions WHERE lower(btrim(name)) = 'bad';

  IF bad_order IS NULL THEN
    INSERT INTO asset_conditions (name, sort_order)
    SELECT 'fair', COALESCE(MAX(sort_order), 0) + 1 FROM asset_conditions;
  ELSE
    UPDATE asset_conditions SET sort_order = sort_order + 1 WHERE sort_order >= bad_order;
    INSERT INTO asset_conditions (name, sort_order) VALUES ('fair', bad_order);
  END IF;
END $$;

COMMIT;
