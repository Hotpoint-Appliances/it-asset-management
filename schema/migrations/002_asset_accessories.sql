-- 002 — accessories catalog + asset_accessories
--
-- Why: assets ship with accessories (chargers, mice, docking stations, bags...) that need to be
-- recorded against the asset so they can be checked on return, transfer or disposal. The
-- catalog (`accessories`) is admin-managed under Settings > Accessories; `asset_accessories`
-- links catalog items to an asset with a quantity and an optional note.
--
-- Rules enforced in app logic (see docs/asset-lifecycle-flow.md rule 8):
--   - An asset's accessories can only change while its status is not disposed/lost/stolen.
--   - Every add/remove/change writes an accessory_added / accessory_removed /
--     accessory_updated row to asset_audit_log in the same transaction.
--   - A catalog accessory attached to any asset can't be deleted (ON DELETE RESTRICT), only
--     retired via is_active = FALSE, which hides it from pickers but keeps existing links.
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/002_asset_accessories.sql

CREATE TABLE IF NOT EXISTS accessories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_accessories_updated_at ON accessories;
CREATE TRIGGER trg_accessories_updated_at BEFORE UPDATE ON accessories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO accessories (name, sort_order) VALUES
  ('Charger', 1), ('Mouse', 2), ('Keyboard', 3), ('Docking station', 4), ('Laptop bag', 5)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS asset_accessories (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  accessory_id INT NOT NULL REFERENCES accessories(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, accessory_id)
);
DROP TRIGGER IF EXISTS trg_asset_accessories_updated_at ON asset_accessories;
CREATE TRIGGER trg_asset_accessories_updated_at BEFORE UPDATE ON asset_accessories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The PK covers per-asset lookups; this one backs the "is this accessory in use?" delete check.
CREATE INDEX IF NOT EXISTS idx_asset_accessories_accessory ON asset_accessories(accessory_id);
