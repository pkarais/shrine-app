-- Shrine Ops - Complete Safe Schema (run this in Supabase SQL Editor)
-- Creates ALL missing tables. No data loss — uses IF NOT EXISTS.

-- SHIFTS (clock-in/out)
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WALKTHROUGHS (daily facility/security checks)
CREATE TABLE IF NOT EXISTS walkthroughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'facility',
  walkthrough_type TEXT NOT NULL DEFAULT 'opening',
  checks JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  media_urls JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INCIDENTS (incident reports)
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  incident_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift TEXT NOT NULL DEFAULT 'opening',
  location TEXT NOT NULL DEFAULT 'other',
  incident_types TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL,
  involved_person_name TEXT,
  involved_person_description TEXT,
  involved_person_contact TEXT,
  witness_name TEXT,
  witness_contact TEXT,
  witness_statement TEXT,
  actions_taken TEXT[] NOT NULL DEFAULT '{}',
  authorities_contacted BOOLEAN NOT NULL DEFAULT false,
  agency_contacted TEXT[],
  officer_name_badge TEXT,
  case_number TEXT,
  evidence_photos BOOLEAN NOT NULL DEFAULT false,
  evidence_footage BOOLEAN NOT NULL DEFAULT false,
  evidence_statements BOOLEAN NOT NULL DEFAULT false,
  camera_location TEXT,
  follow_up_required TEXT[],
  follow_up_details TEXT,
  severity TEXT NOT NULL DEFAULT 'low',
  media_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BREAKS (break timer records)
CREATE TABLE IF NOT EXISTS breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  break_end TIMESTAMPTZ
);

-- MAINTENANCE TICKETS
CREATE TABLE IF NOT EXISTS maintenance_tickets (
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

-- MESSAGES (P2P)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STAFF ASSIGNMENTS
CREATE TABLE IF NOT EXISTS staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_assigned TEXT NOT NULL CHECK (role_assigned IN ('operations', 'security', 'greeter', 'director')),
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- VISITOR VOLUME
CREATE TABLE IF NOT EXISTS visitor_volume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id BIGINT REFERENCES events(id) ON DELETE SET NULL,
  count INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- STAFF DIRECTORY
CREATE TABLE IF NOT EXISTS staff_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT,
  role TEXT,
  department TEXT,
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts (user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_event_id ON shifts (event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_event ON staff_assignments (event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON staff_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_status ON maintenance_tickets (status);
CREATE INDEX IF NOT EXISTS idx_breaks_shift_id ON breaks (shift_id);
CREATE INDEX IF NOT EXISTS idx_visitor_volume_event ON visitor_volume (event_id);

-- RLS (safe — skips if policy already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_select' AND tablename = 'events') THEN
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (true);
    CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_select' AND tablename = 'shifts') THEN
    ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "shifts_select" ON shifts FOR SELECT TO authenticated USING (true);
    CREATE POLICY "shifts_insert" ON shifts FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "shifts_update" ON shifts FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'walkthroughs_select' AND tablename = 'walkthroughs') THEN
    ALTER TABLE walkthroughs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "walkthroughs_select" ON walkthroughs FOR SELECT TO authenticated USING (true);
    CREATE POLICY "walkthroughs_insert" ON walkthroughs FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "walkthroughs_update" ON walkthroughs FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_select' AND tablename = 'incidents') THEN
    ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "incidents_select" ON incidents FOR SELECT TO authenticated USING (true);
    CREATE POLICY "incidents_insert" ON incidents FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "incidents_update" ON incidents FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'breaks_select' AND tablename = 'breaks') THEN
    ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "breaks_select" ON breaks FOR SELECT TO authenticated USING (true);
    CREATE POLICY "breaks_insert" ON breaks FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "breaks_update" ON breaks FOR UPDATE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tickets_select' AND tablename = 'maintenance_tickets') THEN
    ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tickets_select" ON maintenance_tickets FOR SELECT TO authenticated USING (true);
    CREATE POLICY "tickets_insert" ON maintenance_tickets FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "tickets_update" ON maintenance_tickets FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "tickets_delete" ON maintenance_tickets FOR DELETE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_select' AND tablename = 'messages') THEN
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
    CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
    CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assignments_select' AND tablename = 'staff_assignments') THEN
    ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "assignments_select" ON staff_assignments FOR SELECT TO authenticated USING (true);
    CREATE POLICY "assignments_insert" ON staff_assignments FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "assignments_update" ON staff_assignments FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "assignments_delete" ON staff_assignments FOR DELETE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select' AND tablename = 'notifications') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
    CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'visitor_select' AND tablename = 'visitor_volume') THEN
    ALTER TABLE visitor_volume ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "visitor_select" ON visitor_volume FOR SELECT TO authenticated USING (true);
    CREATE POLICY "visitor_insert" ON visitor_volume FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'directory_select' AND tablename = 'staff_directory') THEN
    ALTER TABLE staff_directory ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "directory_select" ON staff_directory FOR SELECT TO authenticated USING (true);
    CREATE POLICY "directory_insert" ON staff_directory FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- AUTO-CREATE PROFILE TRIGGER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'operations'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_events_updated_at ON events;
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_tickets_updated_at ON maintenance_tickets;
CREATE TRIGGER set_tickets_updated_at
  BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-uploads', 'employee-uploads', false)
ON CONFLICT (id) DO NOTHING;

SELECT 'Schema setup complete — all tables, indexes, RLS, triggers, and storage created!' as status;
