-- ============================================================
-- TASEER — migrate_rls.sql
-- Apply tightened RLS to an existing database.
-- Safe to run multiple times.
-- ============================================================

-- Drop old loose policies
DROP POLICY IF EXISTS "sup_active_read"       ON suppliers;
DROP POLICY IF EXISTS "req_insert"            ON requests;
DROP POLICY IF EXISTS "req_read_active"       ON requests;
DROP POLICY IF EXISTS "req_read_own"          ON requests;
DROP POLICY IF EXISTS "otp_all"               ON otp_codes;
DROP POLICY IF EXISTS "revreq_read"           ON reveal_requests;
DROP POLICY IF EXISTS "rev_read"              ON reveals;
DROP POLICY IF EXISTS "rate_insert"           ON rate_limit_log;

-- requests: require phone_verified at DB level
CREATE POLICY "req_insert" ON requests FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL AND session_id <> '' AND
    phone_verified = TRUE AND
    requester_phone IS NOT NULL AND requester_phone <> ''
  );
CREATE POLICY "req_read" ON requests FOR SELECT
  USING (status = 'active');

-- otp_codes: service role only (remove all anon access)
-- no policy = RLS blocks anon

-- reveal_requests: insert only, no anon reads
CREATE POLICY "revreq_insert" ON reveal_requests FOR INSERT
  WITH CHECK (session_id IS NOT NULL AND session_id <> '');

-- reveals: service role only (no policy)

-- rate_limit_log: validated insert
CREATE POLICY "rate_insert" ON rate_limit_log FOR INSERT
  WITH CHECK (identifier IS NOT NULL AND action IS NOT NULL);

-- Rebuild suppliers_public view (approved + active only)
CREATE OR REPLACE VIEW suppliers_public AS
  SELECT id, created_at, city, category_id, supplier_type,
         is_trusted, is_fast, is_active, verification_status
  FROM suppliers
  WHERE is_active = TRUE AND verification_status = 'approved';

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;
