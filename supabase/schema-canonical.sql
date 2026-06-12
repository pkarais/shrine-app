-- Shrine Ops — Canonical Schema (consolidated, safe, idempotent)
-- Run in Supabase SQL Editor. Uses IF NOT EXISTS — no data loss.

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLES
-- ────────────────────────────────────────────────────────────

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'operations' CHECK (role IN ('operations', 'security', 'manager', 'council')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events
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

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    BIGINT REFERENCES events(id) ON DELETE SET NULL,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Walkthroughs
CREATE TABLE IF NOT EXISTS walkthroughs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id        BIGINT REFERENCES events(id) ON DELETE SET NULL,
  category        TEXT NOT NULL DEFAULT 'facility' CHECK (category IN ('facility', 'security')),
  walkthrough_type TEXT NOT NULL DEFAULT 'opening' CHECK (walkthrough_type IN ('opening', 'closing')),
  checks          JSONB NOT NULL DEFAULT '{}',
  notes           TEXT,
  media_urls      JSONB DEFAULT '[]',
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id                BIGINT REFERENCES events(id) ON DELETE SET NULL,
  incident_date           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_date             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shift                   TEXT NOT NULL DEFAULT 'opening' CHECK (shift IN ('opening', 'midday', 'closing')),
  location                TEXT NOT NULL DEFAULT 'other',
  incident_types          TEXT[] NOT NULL DEFAULT '{}',
  description             TEXT NOT NULL,
  involved_person_name    TEXT,
  involved_person_description TEXT,
  involved_person_contact TEXT,
  witness_name            TEXT,
  witness_contact         TEXT,
  witness_statement       TEXT,
  actions_taken           TEXT[] NOT NULL DEFAULT '{}',
  authorities_contacted   BOOLEAN NOT NULL DEFAULT false,
  agency_contacted        TEXT[],
  officer_name_badge      TEXT,
  case_number             TEXT,
  evidence_photos         BOOLEAN NOT NULL DEFAULT false,
  evidence_footage        BOOLEAN NOT NULL DEFAULT false,
  evidence_statements     BOOLEAN NOT NULL DEFAULT false,
  camera_location         TEXT,
  follow_up_required      TEXT[],
  follow_up_details       TEXT,
  severity                TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  media_urls              JSONB DEFAULT '[]',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Breaks
CREATE TABLE IF NOT EXISTS breaks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id    UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  break_end   TIMESTAMPTZ
);

-- Maintenance Tickets
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

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  media_urls    JSONB DEFAULT '[]',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'shift_reminder', 'staffing_gap', 'ticket_assigned', 'message', 'badge_awarded', 'points_deducted', 'eom_nomination')),
  read_at       TIMESTAMPTZ,
  reference_id  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group Conversations (manager group messaging + staff→managers)
CREATE TABLE IF NOT EXISTS group_conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  created_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_manager_group   BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  media_urls        JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_message_reads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id        UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Staff Directory (external directory merged with profiles in Calendar)
-- NOTE: The live column is `name` (not `full_name`). All app code reads/writes
-- staff_directory.name (event-context, recognition, staffing, payroll,
-- live-schedule, schedule-upload, etc.). Keep this aligned with the live DB.
CREATE TABLE IF NOT EXISTS staff_directory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  email         TEXT,
  role          TEXT,
  status        TEXT,
  department    TEXT,
  profile_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Backfill for older databases that were created with the legacy `full_name`
-- column: add `name`/`status` if missing so the canonical schema is safe to
-- re-run against any existing environment.
ALTER TABLE staff_directory ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE staff_directory ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE staff_directory ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE staff_directory ADD COLUMN IF NOT EXISTS email TEXT;

-- Visitor Volume
CREATE TABLE IF NOT EXISTS visitor_volume (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      BIGINT REFERENCES events(id) ON DELETE SET NULL,
  count         INT NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (start_time);
CREATE INDEX IF NOT EXISTS idx_events_google_id ON events (google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts (user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_clock_in ON shifts (clock_in);
CREATE INDEX IF NOT EXISTS idx_shifts_user_clock ON shifts (user_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_event_id ON shifts (event_id);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_user_event ON walkthroughs (user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_completed_at ON walkthroughs (completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_category ON walkthroughs (category);
CREATE INDEX IF NOT EXISTS idx_walkthroughs_type ON walkthroughs (walkthrough_type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents (user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_shift ON incidents (shift);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents (location);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON incidents (incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_breaks_shift_id ON breaks (shift_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON maintenance_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON maintenance_tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON maintenance_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON maintenance_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_event ON staff_assignments (event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON staff_assignments (user_id, shift_start);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_directory_email ON staff_directory (email);
CREATE INDEX IF NOT EXISTS idx_staff_directory_role ON staff_directory (role);
CREATE INDEX IF NOT EXISTS idx_visitor_volume_event ON visitor_volume (event_id);
CREATE INDEX IF NOT EXISTS idx_visitor_volume_recorded ON visitor_volume (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_conversations_participant ON conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_conversation ON group_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages (sender_id);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- Helper: get role from profiles table (since role isn't in JWT by default)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_select_auth' AND tablename = 'events') THEN
    CREATE POLICY events_select_auth ON events FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_insert_manager' AND tablename = 'events') THEN
    CREATE POLICY events_insert_manager ON events FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_update_manager' AND tablename = 'events') THEN
    CREATE POLICY events_update_manager ON events FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'events_delete_manager' AND tablename = 'events') THEN
    CREATE POLICY events_delete_manager ON events FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_select_own' AND tablename = 'shifts') THEN
    CREATE POLICY shifts_select_own ON shifts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_insert_own' AND tablename = 'shifts') THEN
    CREATE POLICY shifts_insert_own ON shifts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_update_own' AND tablename = 'shifts') THEN
    CREATE POLICY shifts_update_own ON shifts FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Walkthroughs
ALTER TABLE walkthroughs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'walkthroughs_select_auth' AND tablename = 'walkthroughs') THEN
    CREATE POLICY walkthroughs_select_auth ON walkthroughs FOR SELECT TO authenticated USING (
      user_id = auth.uid() OR public.get_user_role() = 'manager'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'walkthroughs_insert_own' AND tablename = 'walkthroughs') THEN
    CREATE POLICY walkthroughs_insert_own ON walkthroughs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'walkthroughs_update_own' AND tablename = 'walkthroughs') THEN
    CREATE POLICY walkthroughs_update_own ON walkthroughs FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Incidents
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_select_auth' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_select_auth ON incidents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_insert_own' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_insert_own ON incidents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'incidents_update_manager' AND tablename = 'incidents') THEN
    CREATE POLICY incidents_update_manager ON incidents FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- Breaks
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'breaks_select_own' AND tablename = 'breaks') THEN
    CREATE POLICY breaks_select_own ON breaks FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM shifts s WHERE s.id = breaks.shift_id AND s.user_id = auth.uid())
      OR public.get_user_role() = 'manager'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'breaks_insert_own' AND tablename = 'breaks') THEN
    CREATE POLICY breaks_insert_own ON breaks FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM shifts s WHERE s.id = breaks.shift_id AND s.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'breaks_update_own' AND tablename = 'breaks') THEN
    CREATE POLICY breaks_update_own ON breaks FOR UPDATE TO authenticated USING (
      EXISTS (SELECT 1 FROM shifts s WHERE s.id = breaks.shift_id AND s.user_id = auth.uid())
    );
  END IF;
END $$;

-- Maintenance Tickets
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tickets_select_auth' AND tablename = 'maintenance_tickets') THEN
    CREATE POLICY tickets_select_auth ON maintenance_tickets FOR SELECT TO authenticated USING (
      public.get_user_role() = 'manager'
      OR (public.get_user_role() = 'operations' AND (assigned_to IS NULL OR assigned_to = auth.uid() OR user_id = auth.uid()))
      OR (public.get_user_role() = 'security' AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tickets_insert_auth' AND tablename = 'maintenance_tickets') THEN
    CREATE POLICY tickets_insert_auth ON maintenance_tickets FOR INSERT TO authenticated WITH CHECK (
      user_id = auth.uid() AND public.get_user_role() IN ('operations', 'security', 'manager')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tickets_update_auth' AND tablename = 'maintenance_tickets') THEN
    CREATE POLICY tickets_update_auth ON maintenance_tickets FOR UPDATE TO authenticated USING (
      public.get_user_role() = 'manager'
      OR (public.get_user_role() = 'operations' AND (assigned_to = auth.uid() OR user_id = auth.uid()))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tickets_delete_manager' AND tablename = 'maintenance_tickets') THEN
    CREATE POLICY tickets_delete_manager ON maintenance_tickets FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_select_own' AND tablename = 'messages') THEN
    CREATE POLICY messages_select_own ON messages FOR SELECT TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_insert_own' AND tablename = 'messages') THEN
    CREATE POLICY messages_insert_own ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'messages_update_own' AND tablename = 'messages') THEN
    CREATE POLICY messages_update_own ON messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
  END IF;
END $$;

-- Staff Assignments
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assignments_select_auth' AND tablename = 'staff_assignments') THEN
    CREATE POLICY assignments_select_auth ON staff_assignments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assignments_insert_manager' AND tablename = 'staff_assignments') THEN
    CREATE POLICY assignments_insert_manager ON staff_assignments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assignments_update_manager' AND tablename = 'staff_assignments') THEN
    CREATE POLICY assignments_update_manager ON staff_assignments FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'assignments_delete_manager' AND tablename = 'staff_assignments') THEN
    CREATE POLICY assignments_delete_manager ON staff_assignments FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_insert_auth' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_insert_auth ON notifications FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_select_own' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_select_own ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notifications_update_own' AND tablename = 'notifications') THEN
    CREATE POLICY notifications_update_own ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- Group Conversations
ALTER TABLE group_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gc_select_participant' AND tablename = 'group_conversations') THEN
    CREATE POLICY gc_select_participant ON group_conversations FOR SELECT TO authenticated USING (
      id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
      OR (is_manager_group AND public.get_user_role() = 'manager')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gc_insert_manager' AND tablename = 'group_conversations') THEN
    CREATE POLICY gc_insert_manager ON group_conversations FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cp_select_own' AND tablename = 'conversation_participants') THEN
    CREATE POLICY cp_select_own ON conversation_participants FOR SELECT TO authenticated USING (
      user_id = auth.uid()
      OR conversation_id IN (SELECT id FROM group_conversations WHERE is_manager_group = true AND public.get_user_role() = 'manager')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cp_insert_manager' AND tablename = 'conversation_participants') THEN
    CREATE POLICY cp_insert_manager ON conversation_participants FOR INSERT TO authenticated WITH CHECK (
      conversation_id IN (SELECT id FROM group_conversations WHERE is_manager_group = true AND public.get_user_role() = 'manager')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gm_select_participant' AND tablename = 'group_messages') THEN
    CREATE POLICY gm_select_participant ON group_messages FOR SELECT TO authenticated USING (
      conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
      OR conversation_id IN (SELECT id FROM group_conversations WHERE is_manager_group = true AND public.get_user_role() = 'manager')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gm_insert_participant' AND tablename = 'group_messages') THEN
    CREATE POLICY gm_insert_participant ON group_messages FOR INSERT TO authenticated WITH CHECK (
      sender_id = auth.uid()
      AND conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmr_select_own' AND tablename = 'group_message_reads') THEN
    CREATE POLICY gmr_select_own ON group_message_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmr_insert_own' AND tablename = 'group_message_reads') THEN
    CREATE POLICY gmr_insert_own ON group_message_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Staff Directory
ALTER TABLE staff_directory ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_directory_select' AND tablename = 'staff_directory') THEN
    CREATE POLICY staff_directory_select ON staff_directory FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_directory_insert' AND tablename = 'staff_directory') THEN
    CREATE POLICY staff_directory_insert ON staff_directory FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_directory_update' AND tablename = 'staff_directory') THEN
    CREATE POLICY staff_directory_update ON staff_directory FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- Visitor Volume
ALTER TABLE visitor_volume ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'visitor_volume_select_auth' AND tablename = 'visitor_volume') THEN
    CREATE POLICY visitor_volume_select_auth ON visitor_volume FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'visitor_volume_insert_auth' AND tablename = 'visitor_volume') THEN
    CREATE POLICY visitor_volume_insert_auth ON visitor_volume FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Auto-create profile on signup
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

-- Auto-update updated_at
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

-- ────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-uploads', 'employee-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop + recreate for idempotency)
DO $$ BEGIN
  DROP POLICY IF EXISTS employee_uploads_insert ON storage.objects;
  DROP POLICY IF EXISTS employee_uploads_select ON storage.objects;
  DROP POLICY IF EXISTS employee_uploads_update ON storage.objects;
  DROP POLICY IF EXISTS employee_uploads_delete ON storage.objects;
END $$;

CREATE POLICY employee_uploads_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY employee_uploads_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-uploads'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.get_user_role() = 'manager')
  );

CREATE POLICY employee_uploads_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employee-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY employee_uploads_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

SELECT 'Canonical schema applied successfully.' as status;
