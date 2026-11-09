-- 007 — equipment_issue_forms
--
-- Why: the paper IT Equipment Issue Form becomes a form an admin or asset manager triggers from an
-- asset. The owner acknowledges it through an emailed link (no account needed), and a PDF is
-- available before and after. An asset collects many forms over its life, at most one open.
--
-- Everything printed on a form is copied here when it's triggered, so later edits to the asset,
-- user or disclaimer never change a form already sent. Only a SHA-256 hash of the link token is
-- stored. Rules live in lib/db/issueForms.ts.
--
-- Already folded into schema.sql for fresh installs. Idempotent, safe to re-run.
-- Apply: psql "$DATABASE_URL" -f schema/migrations/007_equipment_issue_forms.sql

CREATE SEQUENCE IF NOT EXISTS equipment_issue_form_number_seq;

CREATE TABLE IF NOT EXISTS equipment_issue_forms (
  id UUID PRIMARY KEY,
  form_number BIGINT UNIQUE NOT NULL DEFAULT nextval('equipment_issue_form_number_seq'), -- printed as EIF-000001
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT, -- signed forms are never deleted
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged', 'disputed', 'voided', 'superseded', 'expired')),

  -- Frozen when triggered
  issue_date DATE NOT NULL,
  equipment_type VARCHAR(150) NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(200) NOT NULL,
  serial_number VARCHAR(100) NOT NULL,
  finance_asset_no VARCHAR(50) NOT NULL, -- the asset tag
  physical_condition VARCHAR(50) NOT NULL,
  condition_comment TEXT,
  accessories JSONB NOT NULL DEFAULT '[]', -- [{ name, quantity, notes }]
  department VARCHAR(150) NOT NULL,
  location VARCHAR(150) NOT NULL,
  issued_to_name VARCHAR(150) NOT NULL,
  issued_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_email VARCHAR(150) NOT NULL,
  payroll_number VARCHAR(50) NOT NULL,
  approved_by_name VARCHAR(255) NOT NULL, -- a HOD from the requisitions app
  approved_by_email VARCHAR(255) NOT NULL,
  remarks TEXT,
  reissue_reason VARCHAR(200),
  disclaimer JSONB NOT NULL, -- the paragraphs the recipient agreed to
  content_hash CHAR(64) NOT NULL, -- hex SHA-256 of the frozen fields, printed on the PDF

  -- The emailed link
  token_hash CHAR(64) UNIQUE NOT NULL,
  token_nonce CHAR(32) NOT NULL, -- with the app secret, re-derives the link for reminders
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ,
  email_status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
  reminder_count INT NOT NULL DEFAULT 0,

  -- Outcome
  acknowledged_at TIMESTAMPTZ,
  acknowledged_name VARCHAR(150),
  acknowledged_ip VARCHAR(64),
  acknowledged_user_agent VARCHAR(500),
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES users(id),
  void_reason VARCHAR(500),
  superseded_by UUID REFERENCES equipment_issue_forms(id),

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_equipment_issue_forms_updated_at ON equipment_issue_forms;
CREATE TRIGGER trg_equipment_issue_forms_updated_at BEFORE UPDATE ON equipment_issue_forms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_issue_forms_asset ON equipment_issue_forms(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issue_forms_pending ON equipment_issue_forms(expires_at) WHERE status = 'pending';
-- One open form per asset, enforced here so two simultaneous triggers can't both succeed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_forms_open_per_asset
  ON equipment_issue_forms(asset_id) WHERE status IN ('pending', 'disputed');
