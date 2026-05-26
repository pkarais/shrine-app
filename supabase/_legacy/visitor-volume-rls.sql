-- Idempotent RLS patch for visitor_volume telemetry writes

ALTER TABLE IF EXISTS public.visitor_volume ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'visitor_volume'
      AND policyname = 'visitor_select'
  ) THEN
    CREATE POLICY visitor_select
      ON public.visitor_volume
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'visitor_volume'
      AND policyname = 'visitor_insert'
  ) THEN
    CREATE POLICY visitor_insert
      ON public.visitor_volume
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'visitor_volume'
      AND policyname = 'visitor_select_anon'
  ) THEN
    CREATE POLICY visitor_select_anon
      ON public.visitor_volume
      FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'visitor_volume'
      AND policyname = 'visitor_insert_anon'
  ) THEN
    CREATE POLICY visitor_insert_anon
      ON public.visitor_volume
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END
$$;
