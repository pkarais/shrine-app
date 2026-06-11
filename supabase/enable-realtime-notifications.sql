-- Enable Supabase Realtime for the notifications table so the in-app bell
-- (components/layout/NotificationBell.tsx) receives postgres_changes INSERT
-- events when new rows are written by lib/actions/messages.ts.
--
-- Run once in the Supabase SQL editor against the project database.
-- Safe to re-run: the DO block checks for existing membership first.

DO $$
BEGIN
  -- Make sure the supabase_realtime publication exists (it does on all
  -- Supabase projects, but check defensively for self-hosted setups).
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Add public.notifications to the publication if not already a member.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Ensure REPLICA IDENTITY is FULL so the row payload contains all columns
-- (the bell reads title, body, type, reference_id from payload.new).
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
