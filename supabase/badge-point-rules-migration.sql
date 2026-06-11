-- ============================================================
-- Badge Point Rules Migration
-- Run this in the Supabase SQL Editor.
-- Wires every recognition badge into gamification_point_rules
-- so the Points tab shows each badge, and badge awards can
-- insert gamification_point_events without FK violations.
-- Existing system rules (shift_completed, etc.) are untouched.
-- ============================================================

-- ── Generic fallback (keeps any existing point_events FK-safe) ─
INSERT INTO public.gamification_point_rules (event_type, category, description, points, severity)
VALUES ('badge_earned', 'recognition', 'Recognition badge earned', 0, 'positive')
ON CONFLICT (event_type) DO NOTHING;

-- ── Active badges — use their real point values ────────────────
INSERT INTO public.gamification_point_rules (event_type, category, description, points, severity)
VALUES
  ('badge_always_on_time',       'recognition', 'Always On Time — Arrived on time for every scheduled shift during the recognition period. No lateness, proper clock-in/out, ready at shift start.',                  10, 'positive'),
  ('badge_perfect_attendance',   'recognition', 'Perfect Attendance — Completed all scheduled shifts during the month without absence. No unexcused absences, no no-call/no-show.',                                  50, 'positive'),
  ('badge_pristine_space',       'recognition', 'Pristine Space — Kept assigned areas consistently clean, presentable, and inspection-ready. Floors, bathrooms, lobby, and shared areas maintained properly.',       25, 'positive'),
  ('badge_safety_watch',         'recognition', 'Safety Watch — Identified and reported safety concerns before they became incidents. Hazards, spills, blocked exits, broken items documented clearly.',              25, 'positive'),
  ('badge_secure_building',      'recognition', 'Secure Building — Followed opening, closing, access, and security procedures correctly. Doors, alarms, restricted areas checked properly.',                         30, 'positive'),
  ('badge_team_player',          'recognition', 'Team Player — Helped coworkers and contributed to a respectful work environment. Assisted others, communicated respectfully, supported team mission.',               20, 'positive'),
  ('badge_self_starter',         'recognition', 'Self-Starter — Took initiative without always waiting to be told. Noticed what needed to be done, handled routine issues independently.',                           25, 'positive'),
  ('badge_event_ready',          'recognition', 'Event Ready — Helped prepare the building successfully for services, meetings, receptions, tours, or special events. Setup completed on time, areas ready.',        30, 'positive'),
  ('badge_reset_champion',       'recognition', 'Reset Champion — Restored the building after an event or service quickly and properly. Trash removed, furniture returned, floors checked.',                         25, 'positive'),
  ('badge_checklist_champion',   'recognition', 'Checklist Champion — Completed daily, weekly, and event checklists accurately and consistently. No pencil-whipping, notes added for incomplete items.',             20, 'positive'),
  ('badge_growth_mindset',       'recognition', 'Growth Mindset — Showed improvement after coaching, correction, or training. Accepted feedback, reduced repeated mistakes, demonstrated willingness to learn.',     35, 'positive'),
  ('badge_above_beyond',         'recognition', 'Above & Beyond — Made a major contribution outside normal expectations. Demonstrated exceptional effort, judgment, or professionalism.',                            50, 'positive')
ON CONFLICT (event_type) DO NOTHING;

-- ── Inactive badges — 5 pt default (ready for future activation) ─
INSERT INTO public.gamification_point_rules (event_type, category, description, points, severity)
VALUES
  ('badge_dependability',           'recognition', 'Dependability — Consistently reliable when assigned tasks, shifts, or responsibilities.',                                               5, 'positive'),
  ('badge_last_minute_hero',        'recognition', 'Last-Minute Hero — Volunteered or stepped up to cover a shift, urgent task, or unexpected need.',                                      5, 'positive'),
  ('badge_marble_guardian',         'recognition', 'Marble Guardian — Demonstrated proper care for marble floors, walls, stairs, counters, and decorative surfaces.',                      5, 'positive'),
  ('badge_restroom_excellence',     'recognition', 'Restroom Excellence — Maintained bathrooms at a consistently high standard. Stocked, checked regularly, issues reported.',             5, 'positive'),
  ('badge_lobby_first_impression',  'recognition', 'Lobby First Impression — Kept the main entrance, lobby, and public-facing areas clean, welcoming, and organized.',                    5, 'positive'),
  ('badge_emergency_ready',         'recognition', 'Emergency Ready — Demonstrated calm, responsible action during drills, alarms, emergencies, or urgent building situations.',           5, 'positive'),
  ('badge_clear_path',              'recognition', 'Clear Path — Kept egress paths, staircases, entrances, and emergency routes clear and safe. Reported obstructions immediately.',       5, 'positive'),
  ('badge_no_drama',                'recognition', 'No Drama — Handled work situations maturely, calmly, and professionally. Avoided gossip, escalated appropriately.',                   5, 'positive'),
  ('badge_respect',                 'recognition', 'Respect — Consistently treated others with dignity, patience, and professionalism. Accepted correction without hostility.',            5, 'positive'),
  ('badge_positive_energy',         'recognition', 'Positive Energy — Brought a helpful, upbeat attitude to the workplace. Encouraged others, helped create a welcoming environment.',    5, 'positive'),
  ('badge_problem_solver',          'recognition', 'Problem Solver — Found practical solutions to operational issues. Identified problems clearly, suggested or applied useful solutions.',5, 'positive'),
  ('badge_fix_it_mindset',          'recognition', 'Fix-It Mindset — Helped with minor repairs, adjustments, setups, resets, and hands-on building needs.',                               5, 'positive'),
  ('badge_improvement_idea',        'recognition', 'Improvement Idea — Suggested a useful improvement to a process, checklist, setup, storage area, or workflow that management approved.',5, 'positive'),
  ('badge_calm_under_pressure',     'recognition', 'Calm Under Pressure — Performed well during busy, crowded, or high-pressure situations.',                                             5, 'positive'),
  ('badge_guest_experience',        'recognition', 'Guest Experience — Created a welcoming experience for visitors, guests, parishioners, vendors, and event attendees.',                  5, 'positive'),
  ('badge_clear_communicator',      'recognition', 'Clear Communicator — Communicated issues, updates, and completed work clearly. Reported problems promptly through proper channels.',   5, 'positive'),
  ('badge_own_it',                  'recognition', 'Own It — Took responsibility for mistakes, missed items, and assigned work without excuses.',                                          5, 'positive'),
  ('badge_follow_through',          'recognition', 'Follow-Through — Completed tasks from start to finish without leaving loose ends.',                                                    5, 'positive'),
  ('badge_new_skill',               'recognition', 'New Skill — Learned a new job-related skill. Training completed, skill demonstrated, supervisor confirmed proficiency.',               5, 'positive'),
  ('badge_cross_trained',           'recognition', 'Cross-Trained — Learned responsibilities outside normal role. Can assist in another area.',                                            5, 'positive'),
  ('badge_tech_helper',             'recognition', 'Tech Helper — Assisted with technology, A/V, app use, checklists, forms, or digital systems.',                                        5, 'positive'),
  ('badge_crew_leader',             'recognition', 'Crew Leader — Helped guide coworkers during shifts, setups, events, and daily operations.',                                            5, 'positive'),
  ('badge_mentor',                  'recognition', 'Mentor — Helped train a new or less experienced employee. Explained tasks clearly, demonstrated patience.',                            5, 'positive'),
  ('badge_standard_bearer',         'recognition', 'Standard Bearer — Consistently modeled the standard expected of the team.',                                                            5, 'positive'),
  ('badge_mission_first',           'recognition', 'Mission First — Put the needs of the building, event, guests, or organization first during an important moment.',                     5, 'positive'),
  ('badge_30_day_excellence',       'recognition', '30-Day Excellence — Demonstrated strong performance for 30 consecutive days.',                                                        5, 'positive'),
  ('badge_90_day_growth',           'recognition', '90-Day Growth — Showed steady improvement over a 90-day period.',                                                                     5, 'positive'),
  ('badge_quarterly_mvp',           'recognition', 'Quarterly MVP — Awarded to one employee per quarter for overall excellence.',                                                         5, 'positive'),
  ('badge_unsung_hero',             'recognition', 'Unsung Hero — Awarded to an employee whose essential work may not always be visible.',                                                 5, 'positive'),
  ('badge_directors_choice',        'recognition', 'Director''s Choice — Awarded by management for exceptional judgment, effort, or professionalism.',                                     5, 'positive'),
  ('badge_team_spirit',             'recognition', 'Team Spirit — Awarded to the employee who best supports morale and teamwork.',                                                        5, 'positive'),
  ('badge_clean_sweep',             'recognition', 'Clean Sweep — Awarded for outstanding cleaning performance across multiple areas.',                                                    5, 'positive'),
  ('badge_event_hero',              'recognition', 'Event Hero — Awarded after major events where the employee played a critical role.',                                                   5, 'positive'),
  ('badge_building_pride',          'recognition', 'Building Pride — Awarded to employees who consistently treat the facility as if it were their own.',                                   5, 'positive'),
  ('badge_employee_of_the_month',   'recognition', 'Employee of the Month — Awarded to the employee selected as Employee of the Month.',                                                  5, 'positive')
ON CONFLICT (event_type) DO NOTHING;

-- ── Activate all badge entries (handles is_active vs active column naming) ─
DO $$
BEGIN
  BEGIN
    UPDATE public.gamification_point_rules SET is_active = true WHERE event_type LIKE 'badge_%';
  EXCEPTION WHEN undefined_column THEN
    UPDATE public.gamification_point_rules SET active = true WHERE event_type LIKE 'badge_%';
  END;
END $$;
