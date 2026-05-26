-- Fix missing foreign key constraints on maintenance_tickets
-- The table was likely created via schema-minimal.sql which omitted FKs,
-- so Supabase schema cache can't resolve profiles:user_id joins.

ALTER TABLE maintenance_tickets
  DROP CONSTRAINT IF EXISTS fk_tickets_user,
  DROP CONSTRAINT IF EXISTS fk_tickets_assigned,
  DROP CONSTRAINT IF EXISTS fk_tickets_event;

ALTER TABLE maintenance_tickets
  ADD CONSTRAINT fk_tickets_user     FOREIGN KEY (user_id)     REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_tickets_assigned FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_tickets_event    FOREIGN KEY (event_id)    REFERENCES events(id) ON DELETE SET NULL;
