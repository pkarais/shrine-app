-- Recognition / Gamification Add-On
-- Run after schema-canonical.sql

-- ────────────────────────────────────────────────────────────
-- UPDATE CATEGORY CONSTRAINT
-- ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.recognition_badges
  DROP CONSTRAINT IF EXISTS recognition_badges_category_check;

-- ────────────────────────────────────────────────────────────
-- RECOGNITION BADGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recognition_badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  icon_url      TEXT,
  category      TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'reliability_attendance','cleaning_building_care','safety_security',
    'teamwork_attitude','initiative_problem_solving','event_service_support',
    'communication_accountability','training_growth','leadership_mentorship',
    'special_achievement','general','performance','leadership','safety','service'
  )),
  point_value   INT NOT NULL DEFAULT 0,
  max_level     INT NOT NULL DEFAULT 1,
  badge_tier    TEXT NOT NULL DEFAULT 'standard' CHECK (badge_tier IN (
    'basic_daily','weekly','monthly','special_event','training','quarterly_mvp','annual'
  )),
  nomination_required BOOLEAN NOT NULL DEFAULT false,
  criteria      JSONB DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- BADGE LEVEL DEFINITIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badge_level_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id      UUID NOT NULL REFERENCES public.recognition_badges(id) ON DELETE CASCADE,
  level_name    TEXT NOT NULL CHECK (level_name IN ('bronze','silver','gold','platinum','legacy')),
  level_number  INT NOT NULL,
  times_required INT NOT NULL DEFAULT 1,
  point_value   INT NOT NULL DEFAULT 0,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(badge_id, level_number)
);

-- ────────────────────────────────────────────────────────────
-- EMPLOYEE BADGE AWARDS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_badge_awards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id      UUID NOT NULL REFERENCES public.recognition_badges(id) ON DELETE CASCADE,
  badge_level   INT NOT NULL DEFAULT 1,
  reason        TEXT,
  awarded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  awarded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nomination_id UUID,
  UNIQUE(employee_id, badge_id, badge_level)
);

-- ────────────────────────────────────────────────────────────
-- BADGE NOMINATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badge_nominations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id      UUID NOT NULL REFERENCES public.recognition_badges(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nominated_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  action_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- GAMIFICATION POINT RULES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gamification_point_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL UNIQUE,
  description   TEXT NOT NULL,
  points        INT NOT NULL,
  is_deduction  BOOLEAN NOT NULL DEFAULT false,
  max_per_day   INT DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- GAMIFICATION POINT EVENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gamification_point_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points        INT NOT NULL,
  event_type    TEXT NOT NULL REFERENCES public.gamification_point_rules(event_type),
  source_id     TEXT,
  source_table  TEXT,
  note          TEXT,
  event_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- POINT DEDUCTIONS (penalty rules)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.point_deductions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points        INT NOT NULL,
  reason        TEXT NOT NULL,
  event_type    TEXT NOT NULL REFERENCES public.gamification_point_rules(event_type),
  source_id     TEXT,
  source_table  TEXT,
  noted_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deduction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- POINT REDEMPTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.point_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_spent  INT NOT NULL,
  reward_type   TEXT NOT NULL CHECK (reward_type IN (
    'gift_card','preferred_shift','lunch_reward','certificate','public_recognition',
    'paid_meal_break','small_bonus','uniform_upgrade','parking_stipend','pto_hour',
    'recognition_wall','team_reward'
  )),
  reward_detail TEXT,
  approved_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- LEADERBOARD PERIODS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboard_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- LEADERBOARD SNAPSHOTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id     UUID NOT NULL REFERENCES public.leaderboard_periods(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank          INT NOT NULL,
  total_points  INT NOT NULL DEFAULT 0,
  badges_earned INT NOT NULL DEFAULT 0,
  shifts_completed INT NOT NULL DEFAULT 0,
  tasks_completed INT NOT NULL DEFAULT 0,
  walkthroughs_completed INT NOT NULL DEFAULT 0,
  on_time_count INT NOT NULL DEFAULT 0,
  late_count    INT NOT NULL DEFAULT 0,
  deductions    INT NOT NULL DEFAULT 0,
  net_points    INT NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_id, employee_id)
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_badge_awards_employee ON public.employee_badge_awards (employee_id);
CREATE INDEX IF NOT EXISTS idx_badge_awards_badge ON public.employee_badge_awards (badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_awards_awarded ON public.employee_badge_awards (awarded_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_employee ON public.badge_nominations (employee_id);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_status ON public.badge_nominations (status);
CREATE INDEX IF NOT EXISTS idx_badge_levels_badge ON public.badge_level_definitions (badge_id);
CREATE INDEX IF NOT EXISTS idx_point_events_employee ON public.gamification_point_events (employee_id);
CREATE INDEX IF NOT EXISTS idx_point_events_date ON public.gamification_point_events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_action ON public.gamification_point_events (event_type);
CREATE INDEX IF NOT EXISTS idx_point_deductions_employee ON public.point_deductions (employee_id);
CREATE INDEX IF NOT EXISTS idx_point_deductions_date ON public.point_deductions (deduction_date DESC);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_employee ON public.point_redemptions (employee_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_period ON public.leaderboard_snapshots (period_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_rank ON public.leaderboard_snapshots (period_id, rank);

-- ────────────────────────────────────────────────────────────
-- VIEWS
-- ────────────────────────────────────────────────────────────

-- Current Month Leaderboard
CREATE OR REPLACE VIEW public.v_current_month_leaderboard AS
WITH leaderboard_data AS (
  SELECT
    pe.employee_id,
    p.full_name AS display_name,
    COALESCE(SUM(pe.points), 0) AS total_points,
    COUNT(DISTINCT eba.id) AS badges_earned,
    COUNT(DISTINCT mt.id) FILTER (WHERE mt.status = 'resolved') AS tasks_completed,
    COUNT(DISTINCT w.id) AS walkthroughs_completed,
    COUNT(DISTINCT s.id) FILTER (WHERE s.clock_in::date = CURRENT_DATE) AS on_time_count,
    0 AS late_count,
    COALESCE((SELECT SUM(pd.points) FROM public.point_deductions pd WHERE pd.employee_id = pe.employee_id AND pd.deduction_date BETWEEN DATE_TRUNC('month', CURRENT_DATE)::date AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date), 0) AS deductions
  FROM public.gamification_point_events pe
  JOIN public.profiles p ON p.id = pe.employee_id
  LEFT JOIN public.employee_badge_awards eba ON eba.employee_id = pe.employee_id
    AND EXTRACT(YEAR FROM eba.awarded_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM eba.awarded_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  LEFT JOIN public.maintenance_tickets mt ON mt.user_id = pe.employee_id
    AND mt.status = 'resolved'
    AND EXTRACT(YEAR FROM mt.resolved_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM mt.resolved_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  LEFT JOIN public.walkthroughs w ON w.user_id = pe.employee_id
    AND EXTRACT(YEAR FROM w.completed_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM w.completed_at) = EXTRACT(MONTH FROM CURRENT_DATE)
  LEFT JOIN public.shifts s ON s.user_id = pe.employee_id
    AND s.clock_in::date = CURRENT_DATE
  WHERE pe.event_date BETWEEN DATE_TRUNC('month', CURRENT_DATE)::date
    AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date
  GROUP BY pe.employee_id, p.full_name
)
SELECT
  ROW_NUMBER() OVER (ORDER BY (total_points - deductions) DESC, badges_earned DESC) AS rank,
  employee_id,
  display_name,
  (total_points - deductions) AS net_points,
  total_points,
  deductions,
  badges_earned,
  tasks_completed,
  walkthroughs_completed,
  on_time_count,
  late_count
FROM leaderboard_data;

-- Employee of the Month Candidates
CREATE OR REPLACE VIEW public.v_employee_of_month_candidates AS
SELECT
  p.id AS employee_id,
  p.full_name AS display_name,
  COALESCE(SUM(gpe.points), 0) AS total_points,
  COUNT(DISTINCT eba.id) AS badges_earned,
  COUNT(DISTINCT s.id) AS shifts_completed,
  COUNT(DISTINCT w.id) AS walkthroughs_completed,
  CASE WHEN COUNT(DISTINCT s.id) >= 10 THEN true ELSE false END AS eligible_for_employee_of_month
FROM public.profiles p
LEFT JOIN public.gamification_point_events gpe ON gpe.employee_id = p.id
  AND EXTRACT(YEAR FROM gpe.event_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM gpe.event_date) = EXTRACT(MONTH FROM CURRENT_DATE)
LEFT JOIN public.employee_badge_awards eba ON eba.employee_id = p.id
  AND EXTRACT(YEAR FROM eba.awarded_at) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM eba.awarded_at) = EXTRACT(MONTH FROM CURRENT_DATE)
LEFT JOIN public.shifts s ON s.user_id = p.id
  AND EXTRACT(YEAR FROM s.clock_in) = EXTRACT(YEAR FROM CURRENT_DATE)
  AND EXTRACT(MONTH FROM s.clock_in) = EXTRACT(MONTH FROM CURRENT_DATE)
WHERE p.role IN ('operations', 'security')
GROUP BY p.id, p.full_name;

-- Badge Progress View (tracks employee badge level progression)
CREATE OR REPLACE VIEW public.v_employee_badge_progress AS
SELECT
  eba.employee_id,
  p.full_name AS employee_name,
  rb.id AS badge_id,
  rb.name AS badge_name,
  rb.category,
  rb.badge_tier,
  MAX(eba.badge_level) AS current_level,
  COUNT(eba.id) AS times_awarded,
  MAX(eba.awarded_at) AS last_awarded
FROM public.employee_badge_awards eba
JOIN public.recognition_badges rb ON rb.id = eba.badge_id
JOIN public.profiles p ON p.id = eba.employee_id
GROUP BY eba.employee_id, p.full_name, rb.id, rb.name, rb.category, rb.badge_tier;

-- Active Badge Catalog (for manager command center)
CREATE OR REPLACE VIEW public.v_active_badge_catalog AS
SELECT
  rb.id,
  rb.name,
  rb.description,
  rb.category,
  rb.point_value,
  rb.max_level,
  rb.badge_tier,
  rb.nomination_required,
  rb.criteria,
  rb.is_active,
  rb.sort_order,
  (SELECT COUNT(*) FROM public.badge_level_definitions bld WHERE bld.badge_id = rb.id) AS levels_defined,
  (SELECT COUNT(*) FROM public.employee_badge_awards eba WHERE eba.badge_id = rb.id) AS times_awarded
FROM public.recognition_badges rb
ORDER BY rb.sort_order, rb.name;

-- Pending Nominations View
CREATE OR REPLACE VIEW public.v_pending_nominations AS
SELECT
  bn.id,
  bn.badge_id,
  rb.name AS badge_name,
  bn.employee_id,
  ep.full_name AS employee_name,
  bn.nominated_by,
  np.full_name AS nominated_by_name,
  bn.reason,
  bn.action_date,
  bn.created_at
FROM public.badge_nominations bn
JOIN public.recognition_badges rb ON rb.id = bn.badge_id
JOIN public.profiles ep ON ep.id = bn.employee_id
JOIN public.profiles np ON np.id = bn.nominated_by
WHERE bn.status = 'pending'
ORDER BY bn.created_at DESC;

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.recognition_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_badge_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_point_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_redemptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Recognition Badges
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badges_select' AND tablename = 'recognition_badges') THEN
    CREATE POLICY badges_select ON public.recognition_badges FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badges_insert_manager' AND tablename = 'recognition_badges') THEN
    CREATE POLICY badges_insert_manager ON public.recognition_badges FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badges_update_manager' AND tablename = 'recognition_badges') THEN
    CREATE POLICY badges_update_manager ON public.recognition_badges FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;

  -- Badge Level Definitions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badge_levels_select' AND tablename = 'badge_level_definitions') THEN
    CREATE POLICY badge_levels_select ON public.badge_level_definitions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badge_levels_insert_manager' AND tablename = 'badge_level_definitions') THEN
    CREATE POLICY badge_levels_insert_manager ON public.badge_level_definitions FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;

  -- Badge Awards
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badge_awards_select' AND tablename = 'employee_badge_awards') THEN
    CREATE POLICY badge_awards_select ON public.employee_badge_awards FOR SELECT TO authenticated USING (employee_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badge_awards_insert_manager' AND tablename = 'employee_badge_awards') THEN
    CREATE POLICY badge_awards_insert_manager ON public.employee_badge_awards FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;

  -- Badge Nominations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominations_select' AND tablename = 'badge_nominations') THEN
    CREATE POLICY nominations_select ON public.badge_nominations FOR SELECT TO authenticated USING (employee_id = auth.uid() OR nominated_by = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominations_insert' AND tablename = 'badge_nominations') THEN
    CREATE POLICY nominations_insert ON public.badge_nominations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominations_update_manager' AND tablename = 'badge_nominations') THEN
    CREATE POLICY nominations_update_manager ON public.badge_nominations FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;

  -- Point Rules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_rules_select' AND tablename = 'gamification_point_rules') THEN
    CREATE POLICY point_rules_select ON public.gamification_point_rules FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_rules_insert_manager' AND tablename = 'gamification_point_rules') THEN
    CREATE POLICY point_rules_insert_manager ON public.gamification_point_rules FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;

  -- Point Events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'point_events_select' AND tablename = 'gamification_point_events') THEN
    CREATE POLICY point_events_select ON public.gamification_point_events FOR SELECT TO authenticated USING (employee_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;

  -- Point Deductions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deductions_select' AND tablename = 'point_deductions') THEN
    CREATE POLICY deductions_select ON public.point_deductions FOR SELECT TO authenticated USING (employee_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deductions_insert_manager' AND tablename = 'point_deductions') THEN
    CREATE POLICY deductions_insert_manager ON public.point_deductions FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;

  -- Point Redemptions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'redemptions_select' AND tablename = 'point_redemptions') THEN
    CREATE POLICY redemptions_select ON public.point_redemptions FOR SELECT TO authenticated USING (employee_id = auth.uid() OR public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'redemptions_insert' AND tablename = 'point_redemptions') THEN
    CREATE POLICY redemptions_insert ON public.point_redemptions FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
  END IF;

  -- Leaderboard Periods & Snapshots
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaderboard_periods_select' AND tablename = 'leaderboard_periods') THEN
    CREATE POLICY leaderboard_periods_select ON public.leaderboard_periods FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leaderboard_snapshots_select' AND tablename = 'leaderboard_snapshots') THEN
    CREATE POLICY leaderboard_snapshots_select ON public.leaderboard_snapshots FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- SEED DATA: ALL BADGE DEFINITIONS (12 active, rest inactive)
-- Managers activate additional badges via command center UI
-- ────────────────────────────────────────────────────────────

INSERT INTO public.recognition_badges (name, description, category, point_value, max_level, badge_tier, nomination_required, criteria, is_active, sort_order) VALUES

-- === 12 CORE BADGES (ACTIVE) ===

('Always On Time', 'Arrived on time for every scheduled shift during the recognition period. No lateness, proper clock-in/out, ready at shift start.',
 'reliability_attendance', 10, 5, 'weekly', false,
 '{"conditions": ["No lateness during the month", "Proper clock-in and clock-out", "Ready to work at shift start"]}', true, 10),

('Perfect Attendance', 'Completed all scheduled shifts during the month without absence. No unexcused absences, no no-call/no-show.',
 'reliability_attendance', 50, 1, 'monthly', false,
 '{"conditions": ["No unexcused absences", "No no-call/no-show", "No early departures without approval"]}', true, 20),

('Pristine Space', 'Kept assigned areas consistently clean, presentable, and inspection-ready. Floors, bathrooms, lobby, and shared areas maintained properly.',
 'cleaning_building_care', 25, 5, 'weekly', false,
 '{"conditions": ["Areas cleaned properly", "No repeated missed checklist items", "Work is visually noticeable"]}', true, 30),

('Safety Watch', 'Identified and reported safety concerns before they became incidents. Hazards, spills, blocked exits, broken items documented clearly.',
 'safety_security', 25, 5, 'weekly', false,
 '{"conditions": ["Reports hazards promptly", "Takes reasonable action", "Documents issue clearly"]}', true, 40),

('Secure Building', 'Followed opening, closing, access, and security procedures correctly. Doors, alarms, restricted areas checked properly.',
 'safety_security', 30, 5, 'monthly', false,
 '{"conditions": ["Security procedures followed", "Suspicious activity reported", "No shortcuts taken"]}', true, 50),

('Team Player', 'Helped coworkers and contributed to a respectful work environment. Assisted others, communicated respectfully, supported team mission.',
 'teamwork_attitude', 20, 5, 'weekly', false,
 '{"conditions": ["Assists others when needed", "Communicates respectfully", "Supports team mission"]}', true, 60),

('Self-Starter', 'Took initiative without always waiting to be told. Noticed what needed to be done, handled routine issues independently.',
 'initiative_problem_solving', 25, 5, 'weekly', false,
 '{"conditions": ["Notices what needs doing", "Handles routine issues independently", "Keeps building moving"]}', true, 70),

('Event Ready', 'Helped prepare the building successfully for services, meetings, receptions, tours, or special events. Setup completed on time, areas ready.',
 'event_service_support', 30, 5, 'special_event', false,
 '{"conditions": ["Setup completed on time", "Areas are ready", "Adjustments handled professionally"]}', true, 80),

('Reset Champion', 'Restored the building after an event or service quickly and properly. Trash removed, furniture returned, floors checked.',
 'event_service_support', 25, 5, 'special_event', false,
 '{"conditions": ["Trash removed", "Furniture returned", "Floors and restrooms checked", "Building ready for next use"]}', true, 90),

('Checklist Champion', 'Completed daily, weekly, and event checklists accurately and consistently. No pencil-whipping, notes added for incomplete items.',
 'communication_accountability', 20, 5, 'weekly', false,
 '{"conditions": ["Checklist completed honestly", "No false completion", "Notes added for missed items"]}', true, 100),

('Growth Mindset', 'Showed improvement after coaching, correction, or training. Accepted feedback, reduced repeated mistakes, demonstrated willingness to learn.',
 'training_growth', 35, 3, 'monthly', false,
 '{"conditions": ["Accepts feedback", "Shows measurable improvement", "Reduces repeated mistakes"]}', true, 110),

('Above & Beyond', 'Made a major contribution outside normal expectations. Demonstrated exceptional effort, judgment, or professionalism.',
 'special_achievement', 50, 3, 'monthly', true,
 '{"conditions": ["Major contribution beyond normal duties", "Exceptional effort", "Manager confirmed meaningful impact"]}', true, 120),

-- === INACTIVE BADGES (available for manager activation) ===

('Dependability', 'Consistently reliable when assigned tasks, shifts, or responsibilities. Completes duties without reminders, communicates issues properly.',
 'reliability_attendance', 20, 5, 'monthly', false,
 '{}', false, 130),

('Last-Minute Hero', 'Volunteered or stepped up to cover a shift, urgent task, or unexpected need. Helped during staffing shortages.',
 'reliability_attendance', 30, 3, 'special_event', true,
 '{"conditions": ["Helps during shortages", "Responds professionally", "Manager confirms difference made"]}', false, 140),

('Marble Guardian', 'Demonstrated proper care for marble floors, walls, stairs, counters, and decorative surfaces. Used correct methods, reported damage.',
 'cleaning_building_care', 25, 5, 'weekly', false,
 '{}', false, 150),

('Restroom Excellence', 'Maintained bathrooms at a consistently high standard. Stocked, checked regularly, issues reported.',
 'cleaning_building_care', 25, 5, 'weekly', false,
 '{}', false, 160),

('Lobby First Impression', 'Kept the main entrance, lobby, and public-facing areas clean, welcoming, and organized before visitors arrive.',
 'cleaning_building_care', 20, 5, 'weekly', false,
 '{}', false, 170),

('Emergency Ready', 'Demonstrated calm, responsible action during drills, alarms, emergencies, or urgent building situations.',
 'safety_security', 40, 3, 'monthly', false,
 '{}', false, 180),

('Clear Path', 'Kept egress paths, staircases, entrances, and emergency routes clear and safe. Reported obstructions immediately.',
 'safety_security', 20, 5, 'weekly', false,
 '{}', false, 190),

('No Drama', 'Handled work situations maturely, calmly, and professionally. Avoided gossip, escalated appropriately, kept workplace calm.',
 'teamwork_attitude', 15, 3, 'weekly', false,
 '{}', false, 200),

('Respect', 'Consistently treated others with dignity, patience, and professionalism. Accepted correction without hostility.',
 'teamwork_attitude', 20, 5, 'monthly', false,
 '{}', false, 210),

('Positive Energy', 'Brought a helpful, upbeat attitude to the workplace. Encouraged others, helped create a welcoming environment.',
 'teamwork_attitude', 15, 3, 'weekly', false,
 '{}', false, 220),

('Problem Solver', 'Found practical solutions to operational issues. Identified problems clearly, suggested or applied useful solutions.',
 'initiative_problem_solving', 30, 5, 'monthly', false,
 '{}', false, 230),

('Fix-It Mindset', 'Helped with minor repairs, adjustments, setups, resets, and hands-on building needs. Used appropriate tools and methods.',
 'initiative_problem_solving', 25, 5, 'weekly', false,
 '{}', false, 240),

('Improvement Idea', 'Suggested a useful improvement to a process, checklist, setup, storage area, or workflow that management approved.',
 'initiative_problem_solving', 35, 3, 'monthly', true,
 '{}', false, 250),

('Calm Under Pressure', 'Performed well during busy, crowded, or high-pressure situations. Stayed focused, handled last-minute requests professionally.',
 'event_service_support', 30, 5, 'special_event', false,
 '{}', false, 260),

('Guest Experience', 'Created a welcoming experience for visitors, guests, parishioners, vendors, and event attendees.',
 'event_service_support', 25, 5, 'monthly', false,
 '{}', false, 270),

('Clear Communicator', 'Communicated issues, updates, and completed work clearly. Reported problems promptly through proper channels.',
 'communication_accountability', 20, 5, 'weekly', false,
 '{}', false, 280),

('Own It', 'Took responsibility for mistakes, missed items, and assigned work without excuses. Acknowledged issues and helped correct them.',
 'communication_accountability', 25, 3, 'monthly', false,
 '{}', false, 290),

('Follow-Through', 'Completed tasks from start to finish without leaving loose ends. Started, finished, reported, and cleaned up afterward.',
 'communication_accountability', 20, 5, 'weekly', false,
 '{}', false, 300),

('New Skill', 'Learned a new job-related skill. Training completed, skill demonstrated, supervisor confirmed proficiency.',
 'training_growth', 40, 3, 'training', false,
 '{}', false, 310),

('Cross-Trained', 'Learned responsibilities outside normal role. Can assist in another area, understands basic workflow, performs work safely.',
 'training_growth', 40, 3, 'training', false,
 '{}', false, 320),

('Tech Helper', 'Assisted with technology, A/V, app use, checklists, forms, or digital systems. Helped coworkers use systems properly.',
 'training_growth', 25, 3, 'training', false,
 '{}', false, 330),

('Crew Leader', 'Helped guide coworkers during shifts, setups, events, and daily operations. Gave direction respectfully, kept work organized.',
 'leadership_mentorship', 35, 5, 'monthly', false,
 '{}', false, 340),

('Mentor', 'Helped train a new or less experienced employee. Explained tasks clearly, demonstrated patience, taught proper methods.',
 'leadership_mentorship', 40, 3, 'monthly', true,
 '{}', false, 350),

('Standard Bearer', 'Consistently modeled the standard expected of the team. Reliable, professional, clean work habits, respectful communication.',
 'leadership_mentorship', 45, 3, 'monthly', false,
 '{}', false, 360),

('Mission First', 'Put the needs of the building, event, guests, or organization first during an important moment. Showed commitment beyond minimum.',
 'leadership_mentorship', 50, 3, 'special_event', true,
 '{}', false, 370),

('30-Day Excellence', 'Demonstrated strong performance for 30 consecutive days.',
 'special_achievement', 50, 3, 'monthly', false,
 '{}', false, 380),

('90-Day Growth', 'Showed steady improvement over a 90-day period.',
 'special_achievement', 75, 3, 'monthly', false,
 '{}', false, 390),

('Quarterly MVP', 'Awarded to one employee per quarter for overall excellence.',
 'special_achievement', 100, 1, 'quarterly_mvp', true,
 '{}', false, 400),

('Unsung Hero', 'Awarded to an employee whose essential work may not always be visible.',
 'special_achievement', 60, 1, 'monthly', true,
 '{}', false, 410),

('Director''s Choice', 'Awarded by management for exceptional judgment, effort, or professionalism.',
 'special_achievement', 75, 1, 'monthly', true,
 '{}', false, 420),

('Team Spirit', 'Awarded to the employee who best supports morale and teamwork.',
 'teamwork_attitude', 25, 3, 'monthly', false,
 '{}', false, 430),

('Clean Sweep', 'Awarded for outstanding cleaning performance across multiple areas.',
 'cleaning_building_care', 35, 3, 'monthly', false,
 '{}', false, 440),

('Event Hero', 'Awarded after major events where the employee played a critical role.',
 'event_service_support', 40, 3, 'special_event', true,
 '{}', false, 450),

('Building Pride', 'Awarded to employees who consistently treat the facility as if it were their own.',
 'cleaning_building_care', 35, 3, 'monthly', false,
 '{}', false, 460),

('Employee of the Month', 'Awarded to the employee selected as Employee of the Month.',
 'special_achievement', 100, 1, 'quarterly_mvp', true,
 '{}', false, 470)

ON CONFLICT (name) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- SEED DATA: Badge Level Definitions
-- ────────────────────────────────────────────────────────────

INSERT INTO public.badge_level_definitions (badge_id, level_name, level_number, times_required, point_value, description)
SELECT rb.id, 'bronze', 1, 1, rb.point_value, 'Earned once for meeting the badge condition.'
FROM public.recognition_badges rb WHERE rb.max_level >= 1
ON CONFLICT (badge_id, level_number) DO NOTHING;

INSERT INTO public.badge_level_definitions (badge_id, level_name, level_number, times_required, point_value, description)
SELECT rb.id, 'silver', 2, 3, rb.point_value * 2, 'Earned after earning the same badge 3 times.'
FROM public.recognition_badges rb WHERE rb.max_level >= 2
ON CONFLICT (badge_id, level_number) DO NOTHING;

INSERT INTO public.badge_level_definitions (badge_id, level_name, level_number, times_required, point_value, description)
SELECT rb.id, 'gold', 3, 5, rb.point_value * 3, 'Earned after earning the same badge 5 times.'
FROM public.recognition_badges rb WHERE rb.max_level >= 3
ON CONFLICT (badge_id, level_number) DO NOTHING;

INSERT INTO public.badge_level_definitions (badge_id, level_name, level_number, times_required, point_value, description)
SELECT rb.id, 'platinum', 4, 8, rb.point_value * 4, 'Earned for consistent excellence over a quarter.'
FROM public.recognition_badges rb WHERE rb.max_level >= 4
ON CONFLICT (badge_id, level_number) DO NOTHING;

INSERT INTO public.badge_level_definitions (badge_id, level_name, level_number, times_required, point_value, description)
SELECT rb.id, 'legacy', 5, 12, rb.point_value * 5, 'Earned for long-term excellence over a full year.'
FROM public.recognition_badges rb WHERE rb.max_level >= 5
ON CONFLICT (badge_id, level_number) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- SEED DATA: Point Rules
-- ────────────────────────────────────────────────────────────

INSERT INTO public.gamification_point_rules (event_type, category, description, points, severity) VALUES
  ('shift_completed', 'attendance', 'Completed a shift', 10, 'positive'),
  ('shift_on_time', 'attendance', 'Clock in on time for shift', 5, 'positive'),
  ('walkthrough_completed', 'operations', 'Completed a walkthrough', 5, 'positive'),
  ('ticket_resolved', 'operations', 'Resolved a maintenance ticket', 15, 'positive'),
  ('ticket_created', 'operations', 'Reported a maintenance issue', 3, 'positive'),
  ('incident_reported', 'safety', 'Reported an incident', 10, 'positive'),
  ('badge_awarded', 'recognition', 'Awarded a recognition badge', 0, 'positive'),
  ('badge_nominated', 'recognition', 'Nominated for a recognition badge', 5, 'positive'),
  ('manager_recognition', 'recognition', 'Manager-recognized contribution', 25, 'positive'),
  ('safety_observation', 'safety', 'Submitted a valid safety observation', 10, 'positive'),
  ('event_support', 'operations', 'Supported an event or service', 15, 'positive'),
  ('overtime_shift', 'attendance', 'Worked an approved overtime shift', 20, 'positive'),
  ('late_clock_in', 'attendance', 'Late clock-in without valid reason', -5, 'minor'),
  ('missed_shift', 'attendance', 'No-call/no-show for scheduled shift', -25, 'critical'),
  ('missed_walkthrough', 'operations', 'Missed required opening or closing walkthrough', -10, 'normal'),
  ('incomplete_checklist', 'operations', 'Checklist submitted incomplete without explanation', -5, 'minor'),
  ('geofence_violation', 'attendance', 'Clock-in or clock-out outside geofence without approval', -10, 'normal'),
  ('policy_violation', 'compliance', 'Documented policy or procedure violation', -20, 'critical')
ON CONFLICT (event_type) DO NOTHING;

SELECT 'Recognition/Gamification schema applied successfully.' as status;
