-- Create walkthrough_archive table to preserve daily walkthrough reports
-- This preserves historical walkthroughs (opening/closing, facility/security)
-- even when the live walkthroughs table is cleared for a new day.

CREATE TABLE IF NOT EXISTS public.walkthrough_archive (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id       UUID NOT NULL,          -- reference to original walkthroughs.id
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id          BIGINT REFERENCES events(id) ON DELETE SET NULL,
  category          TEXT NOT NULL DEFAULT 'facility' CHECK (category IN ('facility', 'security')),
  walkthrough_type  TEXT NOT NULL DEFAULT 'opening' CHECK (walkthrough_type IN ('opening', 'closing')),
  checks            JSONB NOT NULL DEFAULT '{}',
  notes             TEXT,
  media_urls        JSONB DEFAULT '[]',
  completed_at      TIMESTAMPTZ NOT NULL,
  archive_date      DATE NOT NULL,          -- Eastern Time date the walkthrough belongs to
  archived_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_walkthrough_archive_date ON walkthrough_archive (archive_date);
CREATE INDEX IF NOT EXISTS idx_walkthrough_archive_type ON walkthrough_archive (walkthrough_type);
CREATE INDEX IF NOT EXISTS idx_walkthrough_archive_category ON walkthrough_archive (category);
CREATE INDEX IF NOT EXISTS idx_walkthrough_archive_user ON walkthrough_archive (user_id);

-- Prevent duplicate archive entries for the same original walkthrough
CREATE UNIQUE INDEX IF NOT EXISTS idx_walkthrough_archive_unique_original
  ON walkthrough_archive (original_id);

ALTER TABLE public.walkthrough_archive ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation using DO block
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'walkthrough_archive_select_auth' AND tablename = 'walkthrough_archive') THEN
    CREATE POLICY "walkthrough_archive_select_auth"
      ON public.walkthrough_archive FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'walkthrough_archive_insert_auth' AND tablename = 'walkthrough_archive') THEN
    CREATE POLICY "walkthrough_archive_insert_auth"
      ON public.walkthrough_archive FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'walkthrough_archive_delete_manager' AND tablename = 'walkthrough_archive') THEN
    CREATE POLICY "walkthrough_archive_delete_manager"
      ON public.walkthrough_archive FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
  END IF;
END $$;
