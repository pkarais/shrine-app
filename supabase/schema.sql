-- ============================================================
-- Shrine Ops — Complete Database Schema
-- Run this file against your Supabase project to set up all
-- tables, indexes, constraints, and RLS policies.
--
-- AFTER running this file, also run (in order):
--   1. supabase/recognition-gamification-migration.sql
--   2. supabase/operations-brief-migration.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 2. TABLES
-- ────────────────────────────────────────────────────────────

-- User profiles (role assignment)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'operations' CHECK (role IN ('operations', 'security', 'manager')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- Trigger: auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'operations');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Events (populated by Google Sheets sync + manual entry)
CREATE TABLE IF NOT EXISTS events (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT,
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,
  category            TEXT NOT NULL DEFAULT 'standard',
  dcs_link            TEXT,
  required_ops        INT NOT NULL DEFAULT 0,
  required_security   INT NOT NULL DEFAULT 0,
  required_greeter    INT NOT NULL DEFAULT 0,
  director_mandatory  BOOLEAN NOT NULL DEFAULT false,
  google_event_id     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(google_event_id)
);

-- Shifts (clock-in / clock-out records)
CREATE TABLE IF NOT EXISTS shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    BIGINT REFERENCES events(id) ON DELETE SET NULL,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily Walkthrough submissions
CREATE TABLE IF NOT EXISTS walkthroughs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id      BIGINT REFERENCES events(id) ON DELETE SET NULL,
  category      TEXT NOT NULL DEFAULT 'facility' CHECK (category IN ('facility', 'security')),
  walkthrough_type TEXT NOT NULL DEFAULT 'opening' CHECK (walkthrough_type IN ('opening', 'closing')),
  checks        JSONB NOT NULL DEFAULT '{}',
  notes         TEXT,
  media_urls    JSONB DEFAULT '[]',
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incident reports
CREATE TABLE IF NOT EXISTS incidents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id            BIGINT REFERENCES events(id) ON DELETE SET NULL,
  incident_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift               TEXT NOT NULL DEFAULT 'opening' CHECK (shift IN ('opening', 'midday', 'closing')),
  location            TEXT NOT NULL DEFAULT 'other',
  incident_types      TEXT[] NOT NULL DEFAULT '{}',
  description         TEXT NOT NULL,
  involved_person_name TEXT,
  involved_person_description TEXT,
  involved_person_contact TEXT,
  witness_name        TEXT,
  witness_contact     TEXT,
  witness_statement   TEXT,
  actions_taken       TEXT[] NOT NULL DEFAULT '{}',
  authorities_contacted BOOLEAN NOT NULL DEFAULT false,
  agency_contacted    TEXT[],
  officer_name_badge  TEXT,
  case_number         TEXT,
  evidence_photos     BOOLEAN NOT NULL DEFAULT false,
  evidence_footage    BOOLEAN NOT NULL DEFAULT false,
  evidence_statements BOOLEAN NOT NULL DEFAULT false,
  camera_location     TEXT,
  follow_up_required  TEXT[],
  follow_up_details   TEXT,
  severity            TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  media_urls          JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Break records (tied to a shift)
CREATE TABLE IF NOT EXISTS breaks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  break_start   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  break_end     TIMESTAMPTZ
);

-- Maintenance tickets
CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id      BIGINT REFERENCES events(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  priority      TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  media_urls    JSONB DEFAULT '[]',
  assigned_to   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- P2P Messages
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  media_urls    JSONB DEFAULT '[]',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (recipient_id, read_at) WHERE read_at IS NULL;

-- Staff Assignments
CREATE TABLE IF NOT EXISTS staff_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_assigned TEXT NOT NULL CHECK (role_assigned IN ('operations', 'security', 'greeter', 'director')),
  shift_start   TIMESTAMPTZ,
  shift_end     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_assignments_event ON staff_assignments (event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON staff_assignments (user_id, shift_start);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'shift_reminder', 'staffing_gap', 'ticket_assigned')),
  read_at       TIMESTAMPTZ,
  reference_id  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- Visitor Volume
CREATE TABLE IF NOT EXISTS visitor_volume (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      BIGINT REFERENCES events(id) ON DELETE SET NULL,
  count         INT NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_visitor_volume_event ON visitor_volume (event_id);
CREATE INDEX IF NOT EXISTS idx_visitor_volume_recorded ON visitor_volume (recorded_at DESC);

-- Staff Directory (with UUID ID and profile connection for badge awarding)
CREATE TABLE IF NOT EXISTS staff_directory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'off')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group Conversations (used by the chat module)
CREATE TABLE IF NOT EXISTS group_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_manager_group BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  media_urls      JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ────────────────────────────────────────────────────────────

-- Events
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (start_time);
CREATE INDEX IF NOT EXISTS idx_events_google_id ON events (google_event_id) WHERE google_event_id IS NOT NULL;

-- Shifts
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts (user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_clock_in ON shifts (clock_in);
CREATE INDEX IF NOT EXISTS idx_shifts_user_clock ON shifts (user_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_event_id ON shifts (event_id);

-- Walkthroughs
CREATE INDEX IF NOT EXISTS idx_walkthroughs_user_event ON walkthroughs (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_completed_at ON walkthroughs (completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_category ON walkthroughs (category);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_type ON walkthroughs (walkthrough_type);

-- Incidents
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents (user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_shift ON incidents (shift);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents (location);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON incidents (incident_date DESC);

-- Breaks
CREATE INDEX IF NOT EXISTS idx_breaks_shift_id ON breaks (shift_id);

-- Maintenance tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON maintenance_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON maintenance_tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON maintenance_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON maintenance_tickets (assigned_to);

-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE walkthroughs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

-- ── Events policies ────────────────────────────────────────
-- All authenticated users can read events
CREATE POLICY "events_select_auth" ON events
  FOR SELECT TO authenticated
  USING (true);

-- Only managers can insert/update/delete events
CREATE POLICY "events_insert_manager" ON events
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'manager');

CREATE POLICY "events_update_manager" ON events
  FOR UPDATE TO authenticated
  USING (auth.jwt()->>'role' = 'manager');

CREATE POLICY "events_delete_manager" ON events
  FOR DELETE TO authenticated
  USING (auth.jwt()->>'role' = 'manager');

-- ── Shifts policies ────────────────────────────────────────
-- Users see their own shifts; managers see all
CREATE POLICY "shifts_select_own" ON shifts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR auth.jwt()->>'role' = 'manager');

-- Users can create their own shifts
CREATE POLICY "shifts_insert_own" ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own shifts (clock out)
CREATE POLICY "shifts_update_own" ON shifts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── Walkthroughs policies ──────────────────────────────────
-- Operations users see their own facility walkthroughs
CREATE POLICY "walkthroughs_select_operations" ON walkthroughs
  FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid() AND category = 'facility' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'operations')
    OR
    (user_id = auth.uid() AND category = 'security' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'security')
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
  );

CREATE POLICY "walkthroughs_insert_own" ON walkthroughs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (category = 'facility' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'operations')
      OR
      (category = 'security' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'security')
    )
  );

CREATE POLICY "walkthroughs_update_own" ON walkthroughs
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      (category = 'facility' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'operations')
      OR
      (category = 'security' AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'security')
      OR
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
    )
  );

-- ── Incidents policies ─────────────────────────────────────
-- Both operations and security can view their own incidents; managers see all
CREATE POLICY "incidents_select_auth" ON incidents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

-- Both operations and security can submit incidents
CREATE POLICY "incidents_insert_own" ON incidents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only managers can update incidents
CREATE POLICY "incidents_update_manager" ON incidents
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

-- ── Breaks policies ────────────────────────────────────────
CREATE POLICY "breaks_select_own" ON breaks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = breaks.shift_id AND s.user_id = auth.uid()
    )
    OR auth.jwt()->>'role' = 'manager'
  );

CREATE POLICY "breaks_insert_own" ON breaks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = breaks.shift_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "breaks_update_own" ON breaks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = breaks.shift_id AND s.user_id = auth.uid()
    )
  );

-- ── Profiles policies ─────────────────────────────────────
-- All authenticated users can read profiles (staff directory)
CREATE POLICY "profiles_select_auth" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Managers can update any profile
CREATE POLICY "profiles_update_manager" ON profiles
  FOR UPDATE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

-- ── Maintenance tickets policies ────────────────────────────
-- Managers see ALL tickets
-- Operations see: unassigned open tickets + tickets assigned to them + tickets they created
-- Security see: only tickets they created
CREATE POLICY "tickets_select_auth" ON maintenance_tickets
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
    OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'operations'
      AND (
        assigned_to IS NULL
        OR assigned_to = auth.uid()
        OR user_id = auth.uid()
      )
    )
    OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'security'
      AND user_id = auth.uid()
    )
  );

-- Operations, Security, and Managers can create tickets
CREATE POLICY "tickets_insert_auth" ON maintenance_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('operations', 'security', 'manager')
  );

-- Managers can update any ticket (assign, change status)
-- Operations can update tickets assigned to them or that they created
CREATE POLICY "tickets_update_auth" ON maintenance_tickets
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
    OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'operations'
      AND (assigned_to = auth.uid() OR user_id = auth.uid())
    )
  );

-- Only managers can delete tickets
CREATE POLICY "tickets_delete_manager" ON maintenance_tickets
  FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

-- ── Messages policies ──────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_own" ON messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "messages_insert_own" ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update_own" ON messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- ── Staff Assignments policies ─────────────────────────────
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignments_select_auth" ON staff_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR auth.jwt()->>'role' = 'manager');
CREATE POLICY "assignments_insert_manager" ON staff_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'manager');
CREATE POLICY "assignments_update_manager" ON staff_assignments FOR UPDATE TO authenticated
  USING (auth.jwt()->>'role' = 'manager');
CREATE POLICY "assignments_delete_manager" ON staff_assignments FOR DELETE TO authenticated
  USING (auth.jwt()->>'role' = 'manager');

-- ── Notifications policies ─────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ── Visitor Volume policies ────────────────────────────────
ALTER TABLE visitor_volume ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitor_volume_select_auth" ON visitor_volume FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "visitor_volume_insert_auth" ON visitor_volume FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Staff Directory policies ───────────────────────────────
ALTER TABLE staff_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_directory_select_auth" ON staff_directory FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "staff_directory_insert_manager" ON staff_directory FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'manager');
CREATE POLICY "staff_directory_update_manager" ON staff_directory FOR UPDATE TO authenticated
  USING (auth.jwt()->>'role' = 'manager');

-- ── Group Conversations policies ───────────────────────────
ALTER TABLE group_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_conversations_select_participant" ON group_conversations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = group_conversations.id AND cp.user_id = auth.uid()
    )
  );
CREATE POLICY "group_conversations_insert_auth" ON group_conversations FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── Conversation Participants policies ─────────────────────
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversation_participants_select_own" ON conversation_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id AND cp2.user_id = auth.uid()
  ));
CREATE POLICY "conversation_participants_insert_manager" ON conversation_participants FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'manager');

-- ── Group Messages policies ────────────────────────────────
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_messages_select_participant" ON group_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = group_messages.conversation_id AND cp.user_id = auth.uid()
  ));
CREATE POLICY "group_messages_insert_participant" ON group_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = group_messages.conversation_id AND cp.user_id = auth.uid()
  ));

-- ────────────────────────────────────────────────────────────
-- 5. TRIGGERS (auto-update updated_at on events)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_tickets_updated_at
  BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKETS (Supabase Storage)
-- Run this section in Supabase Dashboard > Storage or via SQL editor
-- ────────────────────────────────────────────────────────────

-- Employee uploads bucket (photos, docs, videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-uploads', 'employee-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload to their own folder
CREATE POLICY "employee_uploads_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: users can read their own files, managers can read all
CREATE POLICY "employee_uploads_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-uploads'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR auth.jwt()->>'role' = 'manager'
    )
  );

-- Policy: users can update their own files
CREATE POLICY "employee_uploads_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employee-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: users can delete their own files
CREATE POLICY "employee_uploads_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
