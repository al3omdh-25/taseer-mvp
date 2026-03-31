-- ============================================================
-- TASEER MVP — schema.sql
-- Fresh install. Run once in Supabase SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  label_ar   TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '📦',
  sort_order INT  NOT NULL DEFAULT 0
);

INSERT INTO categories VALUES
  ('home',     'الأجهزة المنزلية والتكييف', '❄️', 1),
  ('building', 'مواد البناء',               '🏗️', 2),
  ('elec',     'الإلكترونيات',              '📱', 3),
  ('services', 'خدمات المنازل',             '🔧', 4),
  ('furn',     'الأثاث والمفروشات',         '🛋️', 5),
  ('cars',     'قطع غيار السيارات',         '🚗', 6),
  ('other',    'طلبات أخرى',                '📦', 7)
ON CONFLICT DO NOTHING;

-- ── suppliers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- business info
  name               TEXT NOT NULL,
  city               TEXT NOT NULL,
  phone              TEXT NOT NULL UNIQUE,
  whatsapp           TEXT NOT NULL,
  category_id        TEXT NOT NULL REFERENCES categories(id),
  supplier_type      TEXT NOT NULL DEFAULT 'store'
                     CHECK (supplier_type IN ('company','store','trader','agent')),
  -- verification
  verification_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending','approved','rejected','suspended')),
  cr_number          TEXT,
  cr_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  nafath_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by        TEXT,
  verified_at        TIMESTAMPTZ,
  rejection_reason   TEXT,
  -- trust (granted manually, never auto)
  is_trusted         BOOLEAN NOT NULL DEFAULT FALSE,
  is_fast            BOOLEAN NOT NULL DEFAULT FALSE,
  -- active only after admin approval
  is_active          BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_sup_category  ON suppliers (category_id, is_active, verification_status);
CREATE INDEX IF NOT EXISTS idx_sup_phone     ON suppliers (phone);
CREATE INDEX IF NOT EXISTS idx_sup_status    ON suppliers (verification_status, created_at);

-- ── requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_code    TEXT UNIQUE NOT NULL,
  session_id      TEXT NOT NULL,
  category_id     TEXT NOT NULL REFERENCES categories(id),
  title           TEXT NOT NULL,
  specs           TEXT,
  quantity        TEXT,
  city            TEXT NOT NULL,
  delivery_needed BOOLEAN NOT NULL DEFAULT FALSE,
  origin_pref     TEXT,
  warranty_pref   TEXT,
  notes           TEXT,
  -- car fields
  car_brand       TEXT,
  car_model       TEXT,
  car_year        TEXT,
  part_condition  TEXT CHECK (part_condition IN ('new','used','original','aftermarket') OR part_condition IS NULL),
  -- contact (for notifications)
  requester_phone TEXT NOT NULL,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','closed','expired'))
);

CREATE INDEX IF NOT EXISTS idx_req_code    ON requests (request_code);
CREATE INDEX IF NOT EXISTS idx_req_cat     ON requests (category_id, status);
CREATE INDEX IF NOT EXISTS idx_req_session ON requests (session_id);

-- ── assignments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ,
  UNIQUE (request_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_assign_sup ON assignments (supplier_id);
CREATE INDEX IF NOT EXISTS idx_assign_req ON assignments (request_id);

-- ── offers ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id    UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  price         NUMERIC(12,2) NOT NULL CHECK (price > 0),
  city          TEXT NOT NULL,
  origin        TEXT NOT NULL,
  warranty      TEXT,
  delivery      BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_days INT,
  supplier_type TEXT NOT NULL,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','withdrawn')),
  UNIQUE (request_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_req ON offers (request_id, status);

-- ── reveal_requests ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reveal_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  offer_id        UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  session_id      TEXT NOT NULL,
  requester_phone TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected')),
  auto_approve_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  approved_by     TEXT,
  UNIQUE (offer_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_revreq_auto ON reveal_requests (auto_approve_at) WHERE status = 'pending';

-- ── reveals ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reveals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  offer_id    UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  method      TEXT NOT NULL DEFAULT 'admin'
              CHECK (method IN ('admin','auto','free')),
  UNIQUE (offer_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reveals ON reveals (offer_id, session_id);

-- ── notification_log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient   TEXT NOT NULL,
  template    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'sent'
              CHECK (status IN ('sent','failed','delivered')),
  provider    TEXT NOT NULL DEFAULT 'console',
  error       TEXT,
  dedup_key   TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_dedup ON notification_log (dedup_key, created_at);

-- ── otp_codes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  attempts    INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_otp ON otp_codes (phone, session_id);

-- ── rate_limit_log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  identifier  TEXT NOT NULL,
  action      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate ON rate_limit_log (identifier, action, created_at);

-- ── request_code generator ────────────────────────────────────
CREATE OR REPLACE FUNCTION gen_request_code() RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT;
  taken BOOLEAN := TRUE;
BEGIN
  WHILE taken LOOP
    code := 'TAS-';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random()*length(chars)+1)::INT, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM requests WHERE request_code = code) INTO taken;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION set_request_code() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.request_code IS NULL OR NEW.request_code = '' THEN
    NEW.request_code := gen_request_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_request_code ON requests;
CREATE TRIGGER trg_request_code BEFORE INSERT ON requests
  FOR EACH ROW EXECUTE FUNCTION set_request_code();

-- ── auto_approve_reveals ──────────────────────────────────────
-- Run via cron: SELECT auto_approve_reveals(); every 30 min
CREATE OR REPLACE FUNCTION auto_approve_reveals() RETURNS INT LANGUAGE plpgsql AS $$
DECLARE n INT := 0; r reveal_requests%ROWTYPE;
BEGIN
  FOR r IN SELECT * FROM reveal_requests
           WHERE status = 'pending' AND auto_approve_at <= NOW()
  LOOP
    INSERT INTO reveals (offer_id, session_id, method)
    VALUES (r.offer_id, r.session_id, 'auto')
    ON CONFLICT (offer_id, session_id) DO NOTHING;
    UPDATE reveal_requests SET status = 'approved', approved_by = 'auto' WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reveal_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reveals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log   ENABLE ROW LEVEL SECURITY;

-- categories: public read
CREATE POLICY "cat_read" ON categories FOR SELECT USING (TRUE);

-- suppliers: no direct anon read (phone/whatsapp protected)
-- service_role bypasses RLS; all reads go through API

-- requests: insert requires phone_verified + session_id
CREATE POLICY "req_insert" ON requests FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL AND session_id <> '' AND
    phone_verified = TRUE AND
    requester_phone IS NOT NULL AND requester_phone <> ''
  );
CREATE POLICY "req_read" ON requests FOR SELECT
  USING (status = 'active');

-- offers: public read (no contact info in this table)
CREATE POLICY "off_read" ON offers FOR SELECT USING (status = 'active');

-- reveal_requests: session-scoped insert
CREATE POLICY "revreq_insert" ON reveal_requests FOR INSERT
  WITH CHECK (session_id IS NOT NULL AND session_id <> '');
-- reads via service role only (admin + offers API)

-- reveals: service role only

-- otp_codes: service role only (no policy = blocked for anon)

-- rate_limit_log: insert only
CREATE POLICY "rate_insert" ON rate_limit_log FOR INSERT
  WITH CHECK (identifier IS NOT NULL AND action IS NOT NULL);

-- notification_log: service role only

-- ── suppliers_public view ─────────────────────────────────────
CREATE OR REPLACE VIEW suppliers_public AS
  SELECT id, created_at, city, category_id, supplier_type,
         is_trusted, is_fast, is_active, verification_status
  FROM suppliers
  WHERE is_active = TRUE AND verification_status = 'approved';
