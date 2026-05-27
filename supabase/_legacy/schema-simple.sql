-- Shrine Ops - Simple Setup (run this in Supabase SQL Editor)

-- Drop existing tables
DROP TABLE IF EXISTS breaks CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS staff_assignments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS maintenance_tickets CASCADE;
DROP TABLE IF EXISTS visitor_volume CASCADE;

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'operations',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EVENTS
CREATE TABLE events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  category TEXT NOT NULL DEFAULT 'standard',
  dcs_link TEXT,
  required_ops INT NOT NULL DEFAULT 0,
  required_security INT NOT NULL DEFAULT 0,
  required_greeter INT NOT NULL DEFAULT 0,
  director_mandatory BOOLEAN NOT NULL DEFAULT false,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SHIFTS
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STAFF ASSIGNMENTS
CREATE TABLE staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  role_assigned TEXT,
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  read_at TIMESTAMPTZ,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MAINTENANCE TICKETS
CREATE TABLE maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'open',
  media_urls JSONB DEFAULT '[]',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- VISITOR VOLUME
CREATE TABLE visitor_volume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id BIGINT,
  count INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (true);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_select" ON shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_insert" ON shifts FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_select" ON staff_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "assignments_insert" ON staff_assignments FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select" ON maintenance_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "tickets_insert" ON maintenance_tickets FOR INSERT TO authenticated WITH CHECK (true);

ALTER TABLE visitor_volume ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitor_select" ON visitor_volume FOR SELECT TO authenticated USING (true);
CREATE POLICY "visitor_insert" ON visitor_volume FOR INSERT TO authenticated WITH CHECK (true);

-- AUTO-CREATE PROFILE TRIGGER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'operations'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- INDEXES
CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_events_start_time ON events (start_time);
CREATE INDEX idx_shifts_user_id ON shifts (user_id);
CREATE INDEX idx_shifts_event_id ON shifts (event_id);
CREATE INDEX idx_messages_sender ON messages (sender_id);
CREATE INDEX idx_messages_recipient ON messages (recipient_id);
CREATE INDEX idx_notifications_user ON notifications (user_id);

SELECT 'Setup Complete!' as status;
