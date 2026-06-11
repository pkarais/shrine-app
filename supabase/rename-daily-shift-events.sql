-- Rename "Daily Shift YYYY-MM-DD" events to "Regular Shrine Open YYYY-MM-DD"
-- and fix the +1 hour UTC bug (literal Z times stored as UTC instead of America/New_York).
--
-- Old buggy rows had: start_time = 'YYYY-MM-DDT09:00:00Z'  (renders as 5am ET in EDT, 4am ET in EST)
-- New correct rows:   start_time = (date + 9 hours) AT TIME ZONE 'America/New_York'
--
-- Apply via Supabase SQL editor. Idempotent.

-- 1) Fix times based on the date embedded in the old title.
UPDATE events
SET
  start_time = (SUBSTRING(title FROM 'Daily Shift (\d{4}-\d{2}-\d{2})')::date + interval '9 hours')  AT TIME ZONE 'America/New_York',
  end_time   = (SUBSTRING(title FROM 'Daily Shift (\d{4}-\d{2}-\d{2})')::date + interval '17 hours') AT TIME ZONE 'America/New_York',
  description = 'Regular shrine open hours — 9:00 AM – 5:00 PM ET'
WHERE title LIKE 'Daily Shift ____-__-__';

-- 2) Rename the title.
UPDATE events
SET title = REPLACE(title, 'Daily Shift ', 'Regular Shrine Open ')
WHERE title LIKE 'Daily Shift ____-__-__';

-- 3) Also normalize times on any rows that already had the new title but
--    still carry the literal-Z time (in case partial renames happened earlier).
UPDATE events
SET
  start_time = (SUBSTRING(title FROM 'Regular Shrine Open (\d{4}-\d{2}-\d{2})')::date + interval '9 hours')  AT TIME ZONE 'America/New_York',
  end_time   = (SUBSTRING(title FROM 'Regular Shrine Open (\d{4}-\d{2}-\d{2})')::date + interval '17 hours') AT TIME ZONE 'America/New_York'
WHERE title LIKE 'Regular Shrine Open ____-__-__';
