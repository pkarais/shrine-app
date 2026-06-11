-- =============================================================
-- Notifications Archive + Manager Alerts Archive
-- Read/acknowledged rows move here on Clear/Ack, retained 30 days.
-- Active tables stay lean; archive feeds the monthly Operations Brief.
-- Run in Supabase SQL Editor. Safe to re-run (idempotent).
-- =============================================================

-- 1. Drop the overly-restrictive type CHECK on notifications.
--    The live system sends badge_awarded, eom_nomination, break_reminder, etc.
--    which were silently failing and breaking dedup. Open the constraint.
DO $$ BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 2. notifications_archive
CREATE TABLE IF NOT EXISTS public.notifications_archive (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id         UUID NOT NULL,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'info',
  reference_id        TEXT,
  original_created_at TIMESTAMPTZ NOT NULL,
  read_at             TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_notif_archive_user_type_date
  ON public.notifications_archive (user_id, type, original_created_at);
CREATE INDEX IF NOT EXISTS idx_notif_archive_expires
  ON public.notifications_archive (expires_at);
CREATE INDEX IF NOT EXISTS idx_notif_archive_user_month
  ON public.notifications_archive (user_id, original_created_at DESC);

ALTER TABLE public.notifications_archive ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_archive_select' AND tablename = 'notifications_archive') THEN
    CREATE POLICY notif_archive_select ON public.notifications_archive
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_archive_insert' AND tablename = 'notifications_archive') THEN
    CREATE POLICY notif_archive_insert ON public.notifications_archive
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'notif_archive_delete_own' AND tablename = 'notifications_archive') THEN
    CREATE POLICY notif_archive_delete_own ON public.notifications_archive
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. manager_alerts_archive (service role handles inserts — no insert policy needed)
CREATE TABLE IF NOT EXISTS public.manager_alerts_archive (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id         UUID NOT NULL,
  alert_type          TEXT NOT NULL,
  message             TEXT NOT NULL,
  severity            TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  triggered_by        TEXT DEFAULT 'Unknown',
  triggered_by_role   TEXT DEFAULT 'staff',
  metadata            JSONB DEFAULT '{}',
  original_created_at TIMESTAMPTZ NOT NULL,
  acknowledged_at     TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_mgr_alerts_archive_type_date
  ON public.manager_alerts_archive (alert_type, original_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mgr_alerts_archive_month
  ON public.manager_alerts_archive (original_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mgr_alerts_archive_expires
  ON public.manager_alerts_archive (expires_at);

ALTER TABLE public.manager_alerts_archive ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mgr_alerts_archive_select' AND tablename = 'manager_alerts_archive') THEN
    CREATE POLICY mgr_alerts_archive_select ON public.manager_alerts_archive
      FOR SELECT TO authenticated
      USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- 4. Purge function — call monthly (via pg_cron or manually)
CREATE OR REPLACE FUNCTION public.purge_expired_archives()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notifications_archive WHERE expires_at < NOW();
  DELETE FROM public.manager_alerts_archive WHERE expires_at < NOW();
END;
$$;

SELECT 'Archive migration applied successfully.' AS status;
