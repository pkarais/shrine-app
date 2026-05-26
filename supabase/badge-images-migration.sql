-- Badge Images Migration
-- Links the 12 badge PNGs from public/badges/ to the recognition_badges table

-- Update existing seed badges with icon_url
UPDATE public.recognition_badges SET icon_url = '/badges/above_and_beyond.png' WHERE name = 'Above & Beyond';
UPDATE public.recognition_badges SET icon_url = '/badges/always_on_time.png' WHERE name = 'On Time';
UPDATE public.recognition_badges SET icon_url = '/badges/perfect_attemdamce.png' WHERE name = 'Perfect Attendance';
UPDATE public.recognition_badges SET icon_url = '/badges/problem_solver.png' WHERE name = 'Problem Solver';
UPDATE public.recognition_badges SET icon_url = '/badges/team_player.png' WHERE name = 'Team Player';
UPDATE public.recognition_badges SET icon_url = '/badges/checklist_champion.png' WHERE name = 'Walkthrough Champion';

-- Insert new badges for remaining images
INSERT INTO public.recognition_badges (name, description, category, point_value, max_level, icon_url) VALUES
  ('Event Ready', 'Prepared and set up spaces for events flawlessly', 'performance', 25, 3, '/badges/event_ready.png'),
  ('Growth Mindset', 'Shows continuous improvement and learning', 'leadership', 30, 3, '/badges/growth_mindset.png'),
  ('Pristine Space', 'Maintained exceptionally clean and organized areas', 'general', 20, 3, '/badges/pristine_space.png'),
  ('Safety Watch', 'Vigilant about safety protocols and hazard prevention', 'safety', 25, 3, '/badges/safety_watch.png'),
  ('Secure Building', 'Exemplary performance in building security and access control', 'safety', 25, 3, '/badges/secure_building.png'),
  ('Self Starter', 'Takes initiative without needing direction', 'leadership', 20, 3, '/badges/self_starter.png')
ON CONFLICT (name) DO UPDATE SET icon_url = EXCLUDED.icon_url;

-- Add point rules for new badge actions
INSERT INTO public.gamification_point_rules (action_key, description, points, max_per_day) VALUES
  ('event_ready_completed', 'Prepared an event space', 5, 2),
  ('growth_milestone', 'Completed a learning or growth milestone', 10, 1),
  ('pristine_check', 'Maintained a pristine work area', 3, 3),
  ('safety_observation', 'Reported a safety observation', 5, 3),
  ('security_round', 'Completed a security round', 5, 2),
  ('self_initiated_task', 'Took initiative on an unassigned task', 8, 2)
ON CONFLICT (action_key) DO NOTHING;

SELECT 'Badge images migration applied successfully.' as status;
