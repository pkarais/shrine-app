-- Shrine Ops — Fix #1-8: RLS, audit logs, group messaging, role enforcement
-- Run in Supabase SQL Editor. Uses IF NOT EXISTS — no data loss.

-- ────────────────────────────────────────────────────────────
-- HELPER FUNCTION: get_user_role()
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ────────────────────────────────────────────────────────────
-- #4 AUDIT LOGS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  details       JSONB DEFAULT '{}',
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_insert' AND tablename = 'audit_logs') THEN
    CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_select_manager' AND tablename = 'audit_logs') THEN
    CREATE POLICY audit_logs_select_manager ON audit_logs FOR SELECT TO authenticated USING (public.get_user_role() = 'manager' OR user_id = auth.uid());
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- #5 GROUP CONVERSATIONS (for manager group messaging + staff→managers)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_manager_group BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES group_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

CREATE TABLE IF NOT EXISTS group_message_reads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_conversations_participant ON conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_conversation ON group_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages (sender_id);

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
      OR conversation_id IN (SELECT id FROM group_conversations WHERE is_manager_group = true)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'cp_insert_manager' AND tablename = 'conversation_participants') THEN
    CREATE POLICY cp_insert_manager ON conversation_participants FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gm_select_participant' AND tablename = 'group_messages') THEN
    CREATE POLICY gm_select_participant ON group_messages FOR SELECT TO authenticated USING (
      conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gm_insert_participant' AND tablename = 'group_messages') THEN
    CREATE POLICY gm_insert_participant ON group_messages FOR INSERT TO authenticated WITH CHECK (
      sender_id = auth.uid()
      AND conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmr_insert_own' AND tablename = 'group_message_reads') THEN
    CREATE POLICY gmr_insert_own ON group_message_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'gmr_select_own' AND tablename = 'group_message_reads') THEN
    CREATE POLICY gmr_select_own ON group_message_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- #3 UPDATE RLS: Messages insert rules
-- Staff (operations/security) can message: other staff OR any manager
-- Managers can message anyone
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS messages_insert_own ON messages;
CREATE POLICY messages_insert_own ON messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid()
  AND (
    public.get_user_role() = 'manager'
    OR (
      public.get_user_role() IN ('operations', 'security')
      AND EXISTS (SELECT 1 FROM profiles WHERE id = recipient_id AND role IN ('operations', 'security', 'manager'))
    )
  )
);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: Auto-audit ticket changes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_ticket_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'ticket.created'
      WHEN TG_OP = 'UPDATE' AND NEW.status = 'resolved' THEN 'ticket.completed'
      WHEN TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN 'ticket.assigned'
      WHEN TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NULL THEN 'ticket.unassigned'
      WHEN TG_OP = 'UPDATE' THEN 'ticket.updated'
      WHEN TG_OP = 'DELETE' THEN 'ticket.deleted'
      ELSE 'ticket.' || lower(TG_OP)
    END,
    'maintenance_tickets',
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'title', COALESCE(NEW.title, OLD.title),
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      'new_status', CASE WHEN TG_OP = 'UPDATE' THEN NEW.status ELSE NULL END,
      'old_assigned_to', CASE WHEN TG_OP = 'UPDATE' THEN OLD.assigned_to ELSE NULL END,
      'new_assigned_to', CASE WHEN TG_OP = 'UPDATE' THEN NEW.assigned_to ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_ticket ON maintenance_tickets;
CREATE TRIGGER trg_audit_ticket
  AFTER INSERT OR UPDATE OR DELETE ON maintenance_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_ticket_change();

-- TRIGGER: Auto-audit message sends
CREATE OR REPLACE FUNCTION public.audit_message_send()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    NEW.sender_id,
    'message.sent',
    'messages',
    NEW.id::text,
    jsonb_build_object('recipient_id', NEW.recipient_id, 'content_length', length(NEW.content))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_message ON messages;
CREATE TRIGGER trg_audit_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_message_send();

-- TRIGGER: Auto-audit group message sends
CREATE OR REPLACE FUNCTION public.audit_group_message_send()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    NEW.sender_id,
    'group_message.sent',
    'group_messages',
    NEW.id::text,
    jsonb_build_object('conversation_id', NEW.conversation_id, 'content_length', length(NEW.content))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_group_message ON group_messages;
CREATE TRIGGER trg_audit_group_message
  AFTER INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_group_message_send();

-- ────────────────────────────────────────────────────────────
-- VIEW: Recent audit trail for managers
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_recent_audit_logs AS
SELECT
  a.id,
  a.user_id,
  p.full_name AS user_name,
  p.role AS user_role,
  a.action,
  a.entity_type,
  a.entity_id,
  a.details,
  a.created_at
FROM audit_logs a
LEFT JOIN profiles p ON p.id = a.user_id
ORDER BY a.created_at DESC;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: Ensure manager group conversation exists
-- Creates the "All Managers" group + auto-adds all manager profiles
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_manager_group_conversation()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv_id UUID;
  v_manager RECORD;
BEGIN
  SELECT id INTO v_conv_id FROM group_conversations WHERE is_manager_group = true LIMIT 1;
  IF v_conv_id IS NULL THEN
    INSERT INTO group_conversations (name, created_by, is_manager_group)
    VALUES ('All Managers', (SELECT id FROM profiles WHERE role = 'manager' LIMIT 1), true)
    RETURNING id INTO v_conv_id;
    FOR v_manager IN SELECT id FROM profiles WHERE role = 'manager' LOOP
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (v_conv_id, v_manager.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  RETURN v_conv_id;
END;
$$;

SELECT 'Fix #1-8 schema applied successfully.' as status;
