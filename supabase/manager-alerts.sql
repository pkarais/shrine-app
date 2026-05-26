-- ============================================================
-- Manager Alerts Table
-- Stores alerts for managers to review and acknowledge
-- ============================================================

-- Create manager_alerts table
CREATE TABLE IF NOT EXISTS public.manager_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type      TEXT NOT NULL,
  message         TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  triggered_by    TEXT DEFAULT 'Unknown',
  triggered_by_role TEXT DEFAULT 'staff',
  metadata        JSONB DEFAULT '{}',
  acknowledged    BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_manager_alerts_acknowledged ON public.manager_alerts(acknowledged);

-- Create index for alert type
CREATE INDEX IF NOT EXISTS idx_manager_alerts_type ON public.manager_alerts(alert_type);

-- Create index for created_at (newest first)
CREATE INDEX IF NOT EXISTS idx_manager_alerts_created ON public.manager_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.manager_alerts ENABLE ROW LEVEL SECURITY;

-- Managers can view all alerts
CREATE POLICY manager_alerts_select ON public.manager_alerts
  FOR SELECT TO authenticated 
  USING (public.get_user_role() = 'manager');

-- Managers can acknowledge alerts
CREATE POLICY manager_alerts_update ON public.manager_alerts
  FOR UPDATE TO authenticated 
  USING (public.get_user_role() = 'manager')
  WITH CHECK (public.get_user_role() = 'manager');

-- Only managers can insert alerts (or system)
CREATE POLICY manager_alerts_insert ON public.manager_alerts
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role() = 'manager');

-- Comment
COMMENT ON TABLE public.manager_alerts IS 'Alert system for managers to track critical events like geofence violations, late clock-ins, etc.';
