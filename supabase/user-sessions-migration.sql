-- ============================================================
-- User Sessions / Presence Tracking
-- Run in: https://supabase.com/dashboard/project/eqgikumohnvgdkwlzkus/sql/new
-- ============================================================

-- Create user_sessions table to track authenticated users
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_heartbeat ON user_sessions (last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_sessions_select" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_update" ON user_sessions;

-- Create RLS policies
CREATE POLICY "user_sessions_select" ON user_sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "user_sessions_insert" ON user_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_sessions_update" ON user_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Function to check if a user is currently online.
-- Window is 5 minutes: heartbeat fires every 60 s, and mobile phones can take
-- up to ~60 s to wake, reconnect, and fire the visibilitychange beat.
-- 5 min gives 4 full missed beats of buffer before a user is marked offline.
CREATE OR REPLACE FUNCTION is_user_online(target_user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_sessions
    WHERE user_id = target_user_id
    AND last_heartbeat > NOW() - INTERVAL '5 minutes'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- View to get active users with online status
CREATE OR REPLACE VIEW v_staff_online_status AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  CASE WHEN is_user_online(p.id) THEN true ELSE false END as is_online,
  us.last_heartbeat,
  COALESCE(us.last_heartbeat > NOW() - INTERVAL '5 minutes', false) as currently_signed_in
FROM profiles p
LEFT JOIN user_sessions us ON us.user_id = p.id
WHERE p.role IN ('operations', 'security', 'manager');
