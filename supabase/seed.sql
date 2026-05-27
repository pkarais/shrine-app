-- ============================================================
-- Shrine Ops — Seed Data (Yesterday's Date)
-- Run this in Supabase SQL Editor AFTER running schema.sql
-- Replace 'YOUR-DIMITRI-USER-ID' with Dimitri's actual auth.users UUID
-- ============================================================

-- Set yesterday's date as a variable
-- Note: Replace the date below with the actual "yesterday" date you want
\set yesterday '2026-03-31'

-- Find Dimitri's user ID (run this first to get the UUID)
-- SELECT id FROM auth.users WHERE email = 'dimitri@shrine.org';

-- ────────────────────────────────────────────────────────────
-- 1. EVENT (yesterday's event)
-- ────────────────────────────────────────────────────────────
INSERT INTO events (title, description, start_time, end_time, category, required_ops, required_security, required_greeter, director_mandatory)
VALUES (
  'Weekly Divine Liturgy',
  'Regular Sunday service with expected large congregation',
  :'yesterday' || ' 08:00:00+00',
  :'yesterday' || '14:00:00+00',
  'liturgy',
  2,
  1,
  2,
  true
) RETURNING id AS event_id \gset

-- ────────────────────────────────────────────────────────────
-- 2. DIMITRI'S SHIFT (9 AM - 5 PM)
-- Replace 'YOUR-DIMITRI-USER-ID' with actual UUID
-- ────────────────────────────────────────────────────────────
INSERT INTO shifts (id, user_id, event_id, clock_in, clock_out)
VALUES (
  gen_random_uuid(),
  'YOUR-DIMITRI-USER-ID'::uuid,
  :event_id,
  :'yesterday' || '09:00:00+00',
  :'yesterday' || '17:00:00+00'
) RETURNING id AS shift_id \gset

-- ────────────────────────────────────────────────────────────
-- 3. BREAKS (morning break, lunch, afternoon break)
-- ────────────────────────────────────────────────────────────
INSERT INTO breaks (shift_id, break_start, break_end)
VALUES
  (:shift_id, :'yesterday' || '10:30:00+00', :'yesterday' || '10:45:00+00'),
  (:shift_id, :'yesterday' || '12:30:00+00', :'yesterday' || '13:00:00+00'),
  (:shift_id, :'yesterday' || '15:00:00+00', :'yesterday' || '15:15:00+00');

-- ────────────────────────────────────────────────────────────
-- 4. OPENING WALKTHROUGH (completed at 8:50 AM)
-- ────────────────────────────────────────────────────────────
INSERT INTO walkthroughs (user_id, event_id, walkthrough_type, checks, notes, completed_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  :event_id,
  'opening',
  '{"lights": true, "doors": true, "sound": true, "seating": true, "signage": true, "parking": true, "restrooms": true, "emergency": true}'::jsonb,
  'All systems operational. Sanctuary prepared for liturgy. Sound system tested and working. Parking area clear.',
  :'yesterday' || '08:50:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 5. CLOSING WALKTHROUGH (completed at 4:55 PM)
-- ────────────────────────────────────────────────────────────
INSERT INTO walkthroughs (user_id, event_id, walkthrough_type, category, checks, notes, completed_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  :event_id,
  'closing',
  'facility',
  '{"closing__initial_walk__offices_and_workspaces_preparing_to_close": true, "closing__initial_walk__upper_floors_and_offices_walked": true, "closing__initial_walk__no_visitors_or_unauthorized_persons_in_building": true, "closing__initial_walk__shrine_floor_clear_of_visitors": true, "closing__initial_walk__staircases_clear": true, "closing__initial_walk__elevator_landing_areas_clear": true, "closing__shrine_area__seating_properly_arranged": true, "closing__shrine_area__candle_stands_safe_and_orderly": true, "closing__shrine_area__shrine_floors_clear_of_debris_or_wax_hazards": true, "closing__shrine_area__lighting_set_to_evening_security_mode": true, "closing__bathrooms__toilets_flushed": true, "closing__bathrooms__water_turned_off": true, "closing__bathrooms__floors_dry": true, "closing__bathrooms__trash_removed_if_necessary": true, "closing__bathrooms__lights_turned_off": true, "closing__kitchen__coffee_machines_turned_off": true, "closing__kitchen__appliances_off": true, "closing__kitchen__counters_clean": true, "closing__kitchen__refrigerator_doors_closed": true, "closing__kitchen__trash_secured": true, "closing__offices__computers_shut_down": true, "closing__offices__office_lights_turned_off": true, "closing__offices__windows_closed": true, "closing__offices__office_doors_closed": true, "closing__building_systems__bms_no_alerts_or_alarms_present": true, "closing__building_systems__hvac_operating_in_evening_schedule": true, "closing__building_systems__shrine_lighting_reduced": true, "closing__building_systems__lobby_lighting_set_to_security_level": true, "closing__building_systems__decorative_lighting_programs_adjusted": true, "closing__elevator__elevator_runs_doors_opening_and_closing_normally": true, "closing__elevator__elevator_returned_to_lobby_level": true, "closing__interior_tidy__visible_trash_removed_from_public_areas": true, "closing__interior_tidy__chairs_and_seating_straightened": true, "closing__interior_tidy__marble_floors_inspected_for_spills_or_debris": true, "closing__interior_tidy__entrance_mats_properly_aligned": true, "closing__secure_doors__main_entrance_locked": true, "closing__secure_doors__secondary_entrance_locked": true, "closing__secure_doors__all_egress_doors_secured": true, "closing__secure_doors__no_suspicious_packages_near_entrances": true, "closing__secure_doors__no_objects_left_against_the_building": true, "closing__secure_doors__entrance_pathway_clear": true, "closing__security_system__cameras_confirmed_operational": true, "closing__security_system__alarm_system_armed": true, "closing__security_system__security_system_fully_activated": true}'::jsonb,
  'All areas secured. Non-essential lights off. Side doors locked. Sound system powered down. Building secure for overnight.',
  :'yesterday' || '16:55:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 5b. SECURITY OPENING WALKTHROUGH (8:45-9:00 AM)
-- ────────────────────────────────────────────────────────────
INSERT INTO walkthroughs (user_id, event_id, walkthrough_type, category, checks, notes, completed_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  :event_id,
  'opening',
  'security',
  '{"security_opening__exterior_perimeter__entrance_doors_and_frames_show_no_signs_of_forced_entry": true, "security_opening__exterior_perimeter__no_suspicious_packages_bags_or_objects_near_the_building": true, "security_opening__exterior_perimeter__no_graffiti_or_vandalism_on_marble_façade": true, "security_opening__exterior_perimeter__glass_doors_and_windows_free_of_damage": true, "security_opening__exterior_perimeter__no_individuals_loitering_directly_at_entrances": true, "security_opening__exterior_perimeter__park_pathway_near_entrance_checked": true, "security_opening__exterior_perimeter__no_unattended_items_left_against_the_building": true, "security_opening__unlock_entrance__entered_building_through_main_entrance": true, "security_opening__unlock_entrance__door_temporarily_locked_behind_entry": true, "security_opening__unlock_entrance__alarm_system_disarmed": true, "security_opening__interior_sweep__lobby_area_inspected_clear": true, "security_opening__interior_sweep__shrine_level_inspected_clear": true, "security_opening__interior_sweep__staircases_inspected_clear": true, "security_opening__interior_sweep__elevator_landing_inspected_clear": true, "security_opening__interior_sweep__community_areas_inspected_clear": true, "security_opening__interior_sweep__no_unauthorized_persons_inside_the_building": true, "security_opening__interior_sweep__no_suspicious_items_or_disturbances": true, "security_opening__staircase_egress__egress_doors_secure_and_functioning": true, "security_opening__staircase_egress__stairwells_clear_of_objects": true, "security_opening__staircase_egress__no_fire_hazards_identified": true, "security_opening__elevator__doors_open_and_close_properly": true, "security_opening__elevator__no_mechanical_issues_detected": true, "security_opening__elevator__elevator_functioning_normally": true, "security_opening__security_systems__security_cameras_operational": true, "security_opening__security_systems__camera_views_unobstructed": true, "security_opening__security_systems__alarm_system_functioning_normally": true}'::jsonb,
  'Perimeter clear. No suspicious activity. All systems operational. Building ready for employees.',
  :'yesterday' || '08:57:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 5c. SECURITY CLOSING WALKTHROUGH (4:30-4:57 PM)
-- ────────────────────────────────────────────────────────────
INSERT INTO walkthroughs (user_id, event_id, walkthrough_type, category, checks, notes, completed_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  :event_id,
  'closing',
  'security',
  '{"security_closing__interior_sweep__offices_inspected": true, "security_closing__interior_sweep__shrine_level_inspected": true, "security_closing__interior_sweep__lobby_inspected": true, "security_closing__interior_sweep__community_areas_inspected": true, "security_closing__interior_sweep__staircases_inspected": true, "security_closing__interior_sweep__all_employees_preparing_to_leave": true, "security_closing__interior_sweep__no_unauthorized_persons_present": true, "security_closing__staircase_exit__egress_doors_secured": true, "security_closing__staircase_exit__stairwells_clear": true, "security_closing__staircase_exit__no_obstructions_found": true, "security_closing__elevator__elevator_functioning_normally": true, "security_closing__elevator__no_passengers_remaining": true, "security_closing__elevator__elevator_returned_to_lobby_level": true, "security_closing__security_systems__cameras_operational": true, "security_closing__security_systems__recording_active": true, "security_closing__security_systems__no_camera_obstructions": true, "security_closing__interior_doors__offices_closed": true, "security_closing__interior_doors__interior_doors_secured": true, "security_closing__exterior_check__no_suspicious_packages_near_entrances": true, "security_closing__exterior_check__no_individuals_lingering_near_doors": true, "security_closing__exterior_check__entrance_pathway_clear": true, "security_closing__lock_building__main_entrance_locked": true, "security_closing__lock_building__secondary_entrances_locked": true, "security_closing__lock_building__all_egress_doors_secured": true, "security_closing__lock_building__alarm_system_armed": true}'::jsonb,
  'Building fully secured. All entrances locked. Alarm armed. Cameras operational.',
  :'yesterday' || '16:57:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 6. SAMPLE INCIDENT REPORT (optional, for demo)
-- ────────────────────────────────────────────────────────────
INSERT INTO incidents (user_id, event_id, title, description, severity, created_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  :event_id,
  'Parking lot light out',
  'The exterior light near the south entrance parking area is not functioning. May need bulb replacement or electrical inspection.',
  'low',
  :'yesterday' || '14:30:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 7. SAMPLE MAINTENANCE TICKET (optional, for demo)
-- ────────────────────────────────────────────────────────────
INSERT INTO maintenance_tickets (user_id, event_id, title, description, priority, status, created_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  :event_id,
  'HVAC noise in narthex',
  'Unusual rattling sound coming from the HVAC unit in the narthex area. Started during morning service. May need technician inspection.',
  'medium',
  'open',
  :'yesterday' || '11:00:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 8. SAMPLE STAFF ASSIGNMENT
-- ────────────────────────────────────────────────────────────
INSERT INTO staff_assignments (event_id, user_id, role_assigned, shift_start, shift_end)
VALUES (
  :event_id,
  'YOUR-DIMITRI-USER-ID'::uuid,
  'operations',
  :'yesterday' || '09:00:00+00',
  :'yesterday' || '17:00:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 9. SAMPLE P2P MESSAGE
-- ────────────────────────────────────────────────────────────
INSERT INTO messages (sender_id, recipient_id, content, created_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  'YOUR-DIMITRI-USER-ID'::uuid,
  'Shift confirmed for tomorrow. Please arrive 15 minutes early for briefing.',
  :'yesterday' || '07:30:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 10. SAMPLE NOTIFICATION (shift reminder)
-- ────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, title, body, type, reference_id, created_at)
VALUES (
  'YOUR-DIMITRI-USER-ID'::uuid,
  'Shift Reminder',
  'Your shift for Weekly Divine Liturgy starts in 1 hour. Please check in at the main entrance.',
  'shift_reminder',
  :event_id::text,
  :'yesterday' || '08:00:00+00'
);

-- ────────────────────────────────────────────────────────────
-- 11. SAMPLE VISITOR VOLUME ENTRY
-- ────────────────────────────────────────────────────────────
INSERT INTO visitor_volume (event_id, count, recorded_at, recorded_by)
VALUES (
  :event_id,
  150,
  :'yesterday' || '10:00:00+00',
  'YOUR-DIMITRI-USER-ID'::uuid
);
