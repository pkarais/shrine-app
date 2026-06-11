-- ============================================================
-- Prevent duplicate staff_assignments rows
-- A staff member should only be assigned to a given event in a
-- given role once. Re-assigning was creating "2/1" double counts
-- on event cards.
-- ============================================================

-- First, dedupe any existing duplicates by keeping the oldest row
-- per (event_id, user_id, role_assigned). Safe to re-run.
DELETE FROM public.staff_assignments a
USING public.staff_assignments b
WHERE a.event_id = b.event_id
  AND a.user_id = b.user_id
  AND COALESCE(a.role_assigned, '') = COALESCE(b.role_assigned, '')
  AND a.created_at > b.created_at;

-- Add the unique constraint.
ALTER TABLE public.staff_assignments
  DROP CONSTRAINT IF EXISTS staff_assignments_event_user_role_unique;

ALTER TABLE public.staff_assignments
  ADD CONSTRAINT staff_assignments_event_user_role_unique
  UNIQUE (event_id, user_id, role_assigned);
