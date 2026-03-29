-- =============================================================
-- TASEER MVP — Supabase Database Schema
-- Run the entire contents of this file in:
--   Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABLE: categories  (static reference)
-- =============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  label_ar   TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '📦',
  sort_order INT  NOT NULL DEFAULT 0
);

INSERT INTO categories (id, label_ar, icon, sort_order) VALUES
  ('home',      'الأجهزة المنزلية والتكييف', '❄️',  1),
  ('building',  'مواد البناء',               '🏗️',  2),
  ('elec',      'الإلكترونيات',              '📱',  3),
  ('services',  'خدمات المنازل',             '🔧',  4),
  ('furn',      'الأثاث والمفروشات',         '🛋️',  5),
  ('cars',      'قطع غيار السيارات',         '🚗',  6),
  ('other',     'طلبات أخرى',                '📦',  7)
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- TABLE: users  (extends Supabase auth.users)
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name    TEXT,
  phone        TEXT,
  role         TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'supplier', 'admin'))
);

-- =============================================================
-- TABLE: suppliers
-- =============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Public info (shown to buyers after payment)
  name           TEXT        NOT NULL,
  city           TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  whatsapp       TEXT        NOT NULL,
  -- Classification
  category_id    TEXT        NOT NULL REFERENCES categories(id),
  supplier_type  TEXT        NOT NULL DEFAULT 'store'
                             CHECK (supplier_type IN ('company','store','trader','agent')),
  -- Trust signals
  is_trusted     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_fast        BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Status
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  notes          TEXT
);

-- =============================================================
-- TABLE: requests
-- =============================================================
CREATE TABLE IF NOT EXISTS requests (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Tracking
  request_code     TEXT        UNIQUE NOT NULL,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id       TEXT,                        -- anonymous buyer session
  -- Core fields
  category_id      TEXT        NOT NULL REFERENCES categories(id),
  title            TEXT        NOT NULL,
  specs            TEXT,
  quantity         TEXT,
  city             TEXT        NOT NULL,
  delivery_needed  BOOLEAN     NOT NULL DEFAULT FALSE,
  origin_pref      TEXT,
  warranty_pref    TEXT,
  notes            TEXT,
  -- Car parts specific
  car_brand        TEXT,
  car_model        TEXT,
  car_year         TEXT,
  part_condition   TEXT        CHECK (part_condition IN ('new','used','original','aftermarket') OR part_condition IS NULL),
  -- Contact
  requester_phone  TEXT,
  requester_email  TEXT,
  -- Lifecycle
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','closed','expired'))
);

-- =============================================================
-- TABLE: request_supplier_assignments
-- Tracks which suppliers received which request
-- =============================================================
CREATE TABLE IF NOT EXISTS request_supplier_assignments (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id   UUID        NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  supplier_id  UUID        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  UNIQUE (request_id, supplier_id)
);

-- =============================================================
-- TABLE: offers
-- =============================================================
CREATE TABLE IF NOT EXISTS offers (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id     UUID        NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  supplier_id    UUID        NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  -- Public offer data (visible before payment)
  price          NUMERIC(10,2) NOT NULL CHECK (price > 0),
  city           TEXT        NOT NULL,
  origin         TEXT        NOT NULL,
  warranty       TEXT,
  delivery       BOOLEAN     NOT NULL DEFAULT FALSE,
  delivery_days  INT,
  supplier_type  TEXT        NOT NULL,
  notes          TEXT,
  -- Lifecycle
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','withdrawn'))
);

-- =============================================================
-- TABLE: payments
-- =============================================================
CREATE TABLE IF NOT EXISTS payments (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Who paid
  session_id       TEXT        NOT NULL,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id       UUID        NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  -- Package purchased
  package_type     TEXT        NOT NULL CHECK (package_type IN ('single','triple','bundle')),
  offer_count      INT         NOT NULL,
  amount_halalas   INT         NOT NULL,           -- Moyasar uses halalas (SAR × 100)
  amount_sar       NUMERIC(8,2) GENERATED ALWAYS AS (amount_halalas::NUMERIC / 100) STORED,
  -- Moyasar data
  moyasar_id       TEXT        UNIQUE,             -- payment ID from Moyasar
  moyasar_status   TEXT,                           -- initiated, paid, failed, etc.
  payment_method   TEXT,                           -- creditcard, mada, applepay
  -- Internal status
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','paid','failed','refunded'))
);

-- =============================================================
-- TABLE: unlock_access
-- One row per (offer, session) that has been paid for
-- =============================================================
CREATE TABLE IF NOT EXISTS unlock_access (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_id   UUID        NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  offer_id     UUID        NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  session_id   TEXT        NOT NULL,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (offer_id, session_id)
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_requests_category    ON requests (category_id);
CREATE INDEX IF NOT EXISTS idx_requests_status      ON requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_session     ON requests (session_id);
CREATE INDEX IF NOT EXISTS idx_requests_code        ON requests (request_code);
CREATE INDEX IF NOT EXISTS idx_offers_request       ON offers (request_id);
CREATE INDEX IF NOT EXISTS idx_offers_supplier      ON offers (supplier_id);
CREATE INDEX IF NOT EXISTS idx_assignments_request  ON request_supplier_assignments (request_id);
CREATE INDEX IF NOT EXISTS idx_assignments_supplier ON request_supplier_assignments (supplier_id);
CREATE INDEX IF NOT EXISTS idx_unlock_offer_session ON unlock_access (offer_id, session_id);
CREATE INDEX IF NOT EXISTS idx_payments_moyasar_id  ON payments (moyasar_id);

-- =============================================================
-- HELPER FUNCTION: generate_request_code
-- =============================================================
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars   TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result  TEXT    := 'TAS-';
  i       INT;
  attempt INT     := 0;
  taken   BOOLEAN := TRUE;
BEGIN
  WHILE taken AND attempt < 20 LOOP
    result := 'TAS-';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM requests WHERE request_code = result) INTO taken;
    attempt := attempt + 1;
  END LOOP;
  RETURN result;
END;
$$;

-- =============================================================
-- TRIGGER: auto-set request_code before insert
-- =============================================================
CREATE OR REPLACE FUNCTION set_request_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.request_code IS NULL OR NEW.request_code = '' THEN
    NEW.request_code := generate_request_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_request_code ON requests;
CREATE TRIGGER trg_set_request_code
  BEFORE INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_code();

-- =============================================================
-- TRIGGER: updated_at auto-update
-- =============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_suppliers_updated_at  BEFORE UPDATE ON suppliers  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_requests_updated_at   BEFORE UPDATE ON requests   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_offers_updated_at     BEFORE UPDATE ON offers     FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_payments_updated_at   BEFORE UPDATE ON payments   FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE categories                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_supplier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlock_access                ENABLE ROW LEVEL SECURITY;

-- ── categories: public read ──────────────────────────────────
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (TRUE);

-- ── users: own row only ──────────────────────────────────────
CREATE POLICY "users_read_own"   ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- ── suppliers: public read (no phone/whatsapp in select-list) ─
-- Contact columns are stripped server-side; RLS just controls row access.
CREATE POLICY "suppliers_public_read"   ON suppliers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "suppliers_owner_update"  ON suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "suppliers_anon_insert"   ON suppliers FOR INSERT WITH CHECK (TRUE);

-- ── requests: buyers see their own; suppliers see active ──────
CREATE POLICY "requests_owner_read" ON requests
  FOR SELECT USING (
    auth.uid() = user_id OR session_id = current_setting('request.session_id', TRUE)
  );

CREATE POLICY "requests_active_read" ON requests
  FOR SELECT USING (status = 'active');

CREATE POLICY "requests_anon_insert" ON requests
  FOR INSERT WITH CHECK (TRUE);

-- ── assignments: suppliers see their own assignments ──────────
CREATE POLICY "assignments_supplier_read" ON request_supplier_assignments
  FOR SELECT USING (TRUE);

CREATE POLICY "assignments_service_insert" ON request_supplier_assignments
  FOR INSERT WITH CHECK (TRUE);

-- ── offers: public read (contact hidden server-side) ──────────
CREATE POLICY "offers_public_read"    ON offers FOR SELECT USING (status = 'active');
CREATE POLICY "offers_supplier_insert" ON offers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "offers_supplier_update" ON offers
  FOR UPDATE USING (
    supplier_id IN (SELECT id FROM suppliers WHERE user_id = auth.uid())
  );

-- ── payments: session/user read ───────────────────────────────
CREATE POLICY "payments_read_own" ON payments
  FOR SELECT USING (
    auth.uid() = user_id OR session_id = current_setting('request.session_id', TRUE)
  );
CREATE POLICY "payments_anon_insert" ON payments FOR INSERT WITH CHECK (TRUE);

-- ── unlock_access: session/user read ─────────────────────────
CREATE POLICY "unlock_read_own" ON unlock_access
  FOR SELECT USING (
    auth.uid() = user_id OR session_id = current_setting('request.session_id', TRUE)
  );
CREATE POLICY "unlock_anon_insert" ON unlock_access FOR INSERT WITH CHECK (TRUE);

-- =============================================================
-- SEED: sample suppliers (for testing)
-- =============================================================
INSERT INTO suppliers (name, city, phone, whatsapp, category_id, supplier_type, is_trusted, is_fast) VALUES
  ('مؤسسة الخليج للتقنية',    'الرياض',  '0501111111', '0501111111', 'elec',     'company', TRUE,  FALSE),
  ('متجر البنية للمواد',      'جدة',     '0502222222', '0502222222', 'building', 'store',   FALSE, TRUE ),
  ('وكالة العز للسيارات',     'الدمام',  '0503333333', '0503333333', 'cars',     'agent',   TRUE,  FALSE),
  ('مؤسسة النسيم للتكييف',    'الرياض',  '0504444444', '0504444444', 'home',     'store',   FALSE, TRUE ),
  ('شركة الأثاث الحديث',      'جدة',     '0505555555', '0505555555', 'furn',     'company', TRUE,  FALSE),
  ('مركز الإلكترونيات الذهبي','الرياض',  '0506666666', '0506666666', 'elec',     'trader',  FALSE, FALSE),
  ('متجر قطع الغيار المتحد',  'الدمام',  '0507777777', '0507777777', 'cars',     'store',   FALSE, TRUE ),
  ('مؤسسة المواد الأولى',     'جدة',     '0508888888', '0508888888', 'building', 'trader',  TRUE,  FALSE),
  ('مركز خدمات المنازل',      'الرياض',  '0509999999', '0509999999', 'services', 'company', FALSE, TRUE ),
  ('بيت الأثاث الفاخر',       'الرياض',  '0500000001', '0500000001', 'furn',     'store',   TRUE,  FALSE)
ON CONFLICT DO NOTHING;
