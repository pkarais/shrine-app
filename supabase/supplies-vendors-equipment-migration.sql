-- ============================================================
-- Supplies, Vendors & Equipment Tables
-- Run in: https://supabase.com/dashboard/project/eqgikumohnvgdkwlzkus/sql/new
-- ============================================================

-- 1. SUPPLIES
CREATE TABLE IF NOT EXISTS supplies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'General',
  quantity       NUMERIC NOT NULL DEFAULT 0,
  unit           TEXT NOT NULL DEFAULT 'units',
  reorder_threshold NUMERIC DEFAULT 0,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplies_category ON supplies (category);

ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supplies_select" ON supplies;
DROP POLICY IF EXISTS "supplies_insert" ON supplies;
DROP POLICY IF EXISTS "supplies_update" ON supplies;
DROP POLICY IF EXISTS "supplies_delete" ON supplies;

CREATE POLICY "supplies_select" ON supplies FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations', 'security'));

CREATE POLICY "supplies_insert" ON supplies FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations', 'security'));

CREATE POLICY "supplies_update" ON supplies FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations', 'security'));

CREATE POLICY "supplies_delete" ON supplies FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations', 'security'));

-- 2. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'General',
  contact_name  TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  notes         TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors (category);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors (active);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_select" ON vendors;
DROP POLICY IF EXISTS "vendors_insert" ON vendors;
DROP POLICY IF EXISTS "vendors_update" ON vendors;
DROP POLICY IF EXISTS "vendors_delete" ON vendors;

CREATE POLICY "vendors_select" ON vendors FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations', 'security'));

CREATE POLICY "vendors_insert" ON vendors FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

CREATE POLICY "vendors_update" ON vendors FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

CREATE POLICY "vendors_delete" ON vendors FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

-- 3. EQUIPMENT
CREATE TABLE IF NOT EXISTS equipment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  equipment_type    TEXT NOT NULL DEFAULT 'General',
  model_number      TEXT,
  serial_number     TEXT,
  manufacturer      TEXT,
  purchase_date     DATE,
  warranty_expiry   DATE,
  last_maintenance  DATE,
  next_maintenance  DATE,
  condition         TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('good', 'fair', 'poor', 'retired')),
  location          TEXT,
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment (equipment_type);
CREATE INDEX IF NOT EXISTS idx_equipment_condition ON equipment (condition);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_select" ON equipment;
DROP POLICY IF EXISTS "equipment_insert" ON equipment;
DROP POLICY IF EXISTS "equipment_update" ON equipment;
DROP POLICY IF EXISTS "equipment_delete" ON equipment;

CREATE POLICY "equipment_select" ON equipment FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations', 'security'));

CREATE POLICY "equipment_insert" ON equipment FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations'));

CREATE POLICY "equipment_update" ON equipment FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations'));

CREATE POLICY "equipment_delete" ON equipment FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'operations'));
