-- Create visitor_volume_archive table to store daily final snapshots
-- This preserves historical visitor counts even when the live visitor_volume
-- table is cleared for a new day.

CREATE TABLE IF NOT EXISTS public.visitor_volume_archive (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      BIGINT REFERENCES events(id) ON DELETE SET NULL,
  count         INT NOT NULL,
  archive_date  DATE NOT NULL,          -- Eastern Time date the snapshot belongs to
  recorded_at   TIMESTAMPTZ NOT NULL, -- original timestamp of the snapshot
  recorded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visitor_volume_archive_date ON visitor_volume_archive (archive_date);
CREATE INDEX IF NOT EXISTS idx_visitor_volume_archive_event ON visitor_volume_archive (event_id);

-- Prevent duplicate archive entries for the same event+day
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_volume_archive_unique_event_day
  ON visitor_volume_archive (archive_date, COALESCE(event_id, 0));

ALTER TABLE public.visitor_volume_archive ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation using DO block
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'visitor_volume_archive_select_auth' AND tablename = 'visitor_volume_archive') THEN
    CREATE POLICY "visitor_volume_archive_select_auth"
      ON public.visitor_volume_archive FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'visitor_volume_archive_insert_auth' AND tablename = 'visitor_volume_archive') THEN
    CREATE POLICY "visitor_volume_archive_insert_auth"
      ON public.visitor_volume_archive FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'visitor_volume_archive_delete_manager' AND tablename = 'visitor_volume_archive') THEN
    CREATE POLICY "visitor_volume_archive_delete_manager"
      ON public.visitor_volume_archive FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
  END IF;
END $$;
