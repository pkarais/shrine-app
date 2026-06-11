-- Create ticket_archive table to preserve resolved/closed maintenance tickets
-- This preserves historical maintenance tickets so managers can review,
-- search, and print past ticket reports even after the live table is cleared.

CREATE TABLE IF NOT EXISTS public.ticket_archive (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id       UUID NOT NULL,          -- reference to original maintenance_tickets.id
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id          BIGINT REFERENCES events(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  priority          TEXT NOT NULL DEFAULT 'low',
  status            TEXT NOT NULL DEFAULT 'resolved',
  media_urls        JSONB DEFAULT '[]',
  assigned_to       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL,
  resolved_at       TIMESTAMPTZ,
  archive_date      DATE NOT NULL,          -- Eastern Time date the ticket belongs to
  archived_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_archive_date ON ticket_archive (archive_date);
CREATE INDEX IF NOT EXISTS idx_ticket_archive_status ON ticket_archive (status);
CREATE INDEX IF NOT EXISTS idx_ticket_archive_priority ON ticket_archive (priority);

-- Prevent duplicate archive entries for the same original ticket
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_archive_unique_original
  ON ticket_archive (original_id);

ALTER TABLE public.ticket_archive ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ticket_archive_select_auth' AND tablename = 'ticket_archive') THEN
    CREATE POLICY "ticket_archive_select_auth"
      ON public.ticket_archive FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ticket_archive_insert_auth' AND tablename = 'ticket_archive') THEN
    CREATE POLICY "ticket_archive_insert_auth"
      ON public.ticket_archive FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ticket_archive_delete_manager' AND tablename = 'ticket_archive') THEN
    CREATE POLICY "ticket_archive_delete_manager"
      ON public.ticket_archive FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
  END IF;
END $$;
