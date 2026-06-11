-- Adds location_type to shifts so we can distinguish on-site (geofenced) vs
-- off-site manager clock-ins for personal hours archives.

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'onsite'
    CHECK (location_type IN ('onsite', 'offsite'));

CREATE INDEX IF NOT EXISTS shifts_user_clock_in_idx
  ON public.shifts (user_id, clock_in DESC);
