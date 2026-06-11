-- Run this in Supabase SQL Editor (dashboard.supabase.com > SQL Editor)
CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_name, day_of_week)
);

INSERT INTO employee_schedules (employee_name, day_of_week, shift_start, shift_end) VALUES
  ('Joshua', 0, '11:00', '17:00'),
  ('Joshua', 3, '11:00', '17:00'),
  ('Joshua', 4, '11:00', '17:00'),
  ('Joshua', 5, '11:00', '17:00'),
  ('Joshua', 6, '11:00', '17:00'),
  ('Fabio', 1, '08:00', '16:00'),
  ('Fabio', 2, '08:00', '16:00'),
  ('Fabio', 3, '08:00', '16:00'),
  ('Fabio', 4, '08:00', '16:00'),
  ('Fabio', 5, '08:00', '16:00'),
  ('Paulin', 0, '11:00', '17:00'),
  ('Paulin', 3, '11:00', '17:00'),
  ('Paulin', 4, '11:00', '17:00'),
  ('Paulin', 5, '11:00', '17:00'),
  ('Paulin', 6, '11:00', '17:00')
ON CONFLICT (employee_name, day_of_week) DO NOTHING;
