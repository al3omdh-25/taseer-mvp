-- ============================================================
-- TASEER — migrate_suppliers_verification.sql
-- Adds verification columns to an existing suppliers table.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- ============================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','approved','rejected','suspended')),
  ADD COLUMN IF NOT EXISTS cr_number          TEXT,
  ADD COLUMN IF NOT EXISTS cr_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nafath_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_by        TEXT,
  ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT;

-- is_active must default to FALSE (new suppliers start inactive)
ALTER TABLE suppliers ALTER COLUMN is_active SET DEFAULT FALSE;

-- Existing active suppliers → mark as approved
UPDATE suppliers
SET verification_status = 'approved',
    verified_at         = NOW(),
    verified_by         = 'migration'
WHERE is_active = TRUE AND verification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sup_status ON suppliers (verification_status, created_at);

-- Rebuild view
CREATE OR REPLACE VIEW suppliers_public AS
  SELECT id, created_at, city, category_id, supplier_type,
         is_trusted, is_fast, is_active, verification_status
  FROM suppliers
  WHERE is_active = TRUE AND verification_status = 'approved';

-- Verify
SELECT verification_status, COUNT(*) AS n,
       SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active
FROM suppliers
GROUP BY verification_status ORDER BY verification_status;
