CREATE TABLE IF NOT EXISTS staff_wake_up_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wake_up_time TIME NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_wake_up_alarms_user ON staff_wake_up_alarms(user_id);

ALTER TABLE staff_wake_up_alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY wake_up_alarms_select_own ON staff_wake_up_alarms
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY wake_up_alarms_insert_own ON staff_wake_up_alarms
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY wake_up_alarms_update_own ON staff_wake_up_alarms
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY wake_up_alarms_delete_own ON staff_wake_up_alarms
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.staff_wake_up_alarms IS 'Per-user wake-up alarm settings for staff shift reminders';
