-- IT Asset Management System — Initial Schema (PostgreSQL)
-- Design decisions this schema encodes (confirmed with stakeholder):
--   1. Unified asset_audit_log table for all history (location/department/owner/condition/status changes)
--   2. Condition changes ARE logged (via asset_audit_log)
--   3. Asset ownership = assigned_user_id FK (system users) + owner_name/owner_email fallback (external/non-login owners)
--   4. Vendor, warranty, and depreciation fields included in MVP (not deferred)
--   5. Simple 3-tier RBAC: admin, asset_manager, viewer
--
-- Conventions:
--   - UUID primary keys for entities exposed in URLs / referenced across modules (users, assets)
--   - SERIAL primary keys for admin-managed lookup/reference tables
--   - created_at/updated_at on every mutable table; updated_at maintained by trigger
--   - Soft delete (deleted_at) on assets — never hard-delete an asset with history/audit records

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RBAC
-- ============================================================
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,        -- admin, asset_manager, viewer
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access: manage users, lookup tables, all assets'),
  ('asset_manager', 'Create/edit/transfer/dispose assets, view all departments'),
  ('viewer', 'Read-only access, scoped to own department');

-- ============================================================
-- Supporting / lookup tables
-- ============================================================
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) UNIQUE NOT NULL,
  code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  parent_location_id INT REFERENCES locations(id) ON DELETE SET NULL, -- e.g. Site > Building > Floor > Room
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  parent_category_id INT REFERENCES categories(id) ON DELETE SET NULL, -- e.g. Hardware > Laptops
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(150),
  contact_email VARCHAR(150),
  contact_phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Admin-editable, deliberately NOT a hardcoded enum — guidelines flag these as fluid
CREATE TABLE asset_conditions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO asset_conditions (name, sort_order) VALUES
  ('good', 1), ('bad', 2), ('worse', 3);

CREATE TABLE asset_statuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO asset_statuses (name, sort_order) VALUES
  ('active', 1), ('in_storage', 2), ('reserved', 3), ('in_repair', 4),
  ('lost', 5), ('stolen', 6), ('disposed', 7);

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- Assets (core entity)
-- ============================================================
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,

  category_id INT NOT NULL REFERENCES categories(id),
  model_number VARCHAR(100),
  serial_number VARCHAR(100),

  location_id INT NOT NULL REFERENCES locations(id),
  department_id INT NOT NULL REFERENCES departments(id),

  image_path VARCHAR(500), -- relative path under the base asset-files directory (see .env ASSET_FILES_BASE_PATH)

  -- Ownership: prefer assigned_user_id (system user); fall back to free text for non-login owners
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_name VARCHAR(150),
  owner_email VARCHAR(150),

  condition_id INT NOT NULL REFERENCES asset_conditions(id),
  status_id INT NOT NULL REFERENCES asset_statuses(id),

  -- Procurement / warranty / depreciation
  vendor_id INT REFERENCES vendors(id),
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  warranty_expiry DATE,
  depreciation_method VARCHAR(30), -- 'straight_line' | 'declining_balance' | NULL (not depreciated)
  useful_life_months INT,
  salvage_value NUMERIC(12,2),

  notes TEXT,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ, -- soft delete; never hard-delete an asset with audit history

  CONSTRAINT chk_asset_owner CHECK (
    assigned_user_id IS NOT NULL OR owner_name IS NOT NULL
  )
);
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_assets_asset_tag ON assets(asset_tag);
CREATE INDEX idx_assets_status ON assets(status_id);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_assets_location ON assets(location_id);
CREATE INDEX idx_assets_assigned_user ON assets(assigned_user_id);
CREATE INDEX idx_assets_deleted_at ON assets(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- Unified audit/history log
--   Covers: created, location_change, department_change, owner_change,
--           condition_change, status_change, updated, maintenance, disposed
-- ============================================================
CREATE TABLE asset_audit_log (
  id BIGSERIAL PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  action_type VARCHAR(40) NOT NULL,
  field_name VARCHAR(60),
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_asset ON asset_audit_log(asset_id, performed_at DESC);
CREATE INDEX idx_audit_log_action_type ON asset_audit_log(action_type);
 
-- ============================================================
-- Attachments (invoices, warranty cards, extra photos — beyond the single image_path)
-- ============================================================
CREATE TABLE asset_attachments (
  id SERIAL PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachments_asset ON asset_attachments(asset_id);

-- ============================================================
-- Maintenance / repair events
-- ============================================================
CREATE TABLE asset_maintenance (
  id SERIAL PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(40) NOT NULL, -- repair | service | inspection
  vendor_id INT REFERENCES vendors(id),
  scheduled_date DATE,
  completed_date DATE,
  cost NUMERIC(12,2),
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- scheduled | in_progress | completed | cancelled
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON asset_maintenance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_maintenance_asset ON asset_maintenance(asset_id);

-- ============================================================
-- Disposal
-- ============================================================
CREATE TABLE asset_disposals (
  id SERIAL PRIMARY KEY,
  asset_id UUID UNIQUE NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  disposal_date DATE NOT NULL,
  disposal_method VARCHAR(30) NOT NULL, -- sold | scrapped | donated | lost | stolen | other
  disposal_value NUMERIC(12,2),
  approved_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  attachment_path VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Notifications (in-app + email-sent tracking via MSAL/Graph)
-- ============================================================
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- warranty_expiring | maintenance_due | asset_assigned | asset_transferred | ...
  title VARCHAR(200) NOT NULL,
  message TEXT,
  related_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- System settings (key/value config editable by admins)
-- ============================================================
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
