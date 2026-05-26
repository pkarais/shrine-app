-- ============================================================
-- Audio / Reminder Template Wiring
-- Populates audio_url and audio_storage_path on reminder_templates
-- and inserts templates for sounds that don't have one yet.
-- ============================================================

-- ─── Update existing rows with audio_url ────────────────────

UPDATE public.reminder_templates SET
  audio_url = '/audio/staff-reminders/wake-up-reminder.mp3',
  audio_storage_path = 'audio/staff-reminders/wake-up-reminder.mp3'
WHERE reminder_type = 'wake_up';

UPDATE public.reminder_templates SET
  audio_url = '/audio/staff-reminders/leave-now-reminder.mp3',
  audio_storage_path = 'audio/staff-reminders/leave-now-reminder.mp3'
WHERE reminder_type = 'leave_now';

UPDATE public.reminder_templates SET
  audio_url = '/audio/staff-reminders/shift-start-reminder.mp3',
  audio_storage_path = 'audio/staff-reminders/shift-start-reminder.mp3'
WHERE reminder_type = 'shift_start';

UPDATE public.reminder_templates SET
  audio_url = '/audio/staff-reminders/late-warning.mp3',
  audio_storage_path = 'audio/staff-reminders/late-warning.mp3'
WHERE reminder_type = 'late_warning';

UPDATE public.reminder_templates SET
  audio_url = '/audio/staff-reminders/geofence-warning.mp3',
  audio_storage_path = 'audio/staff-reminders/geofence-warning.mp3'
WHERE reminder_type = 'geo_fence_warning';

-- ─── Insert templates for sounds that have no row yet ───────

INSERT INTO public.reminder_templates (title, reminder_type, short_text, full_text, audio_url, audio_storage_path, tone, is_global, is_active)
VALUES
-- Staff Reminders (existing table has some, add the rest)
('Shift Started', 'shift_started',
 'Your shift has officially started. Time to make it count.',
 'Your scheduled shift has begun. Please proceed with your assigned duties.',
 '/audio/staff-reminders/shift-started.mp3', 'audio/staff-reminders/shift-started.mp3',
 'positive', true, true),

('Missed Clock-Out Reminder', 'missed_clock_out',
 'Did you forget to clock out? Your shift is still "active" in the system.',
 'You have not clocked out from your last shift. Please clock out or contact your supervisor.',
 '/audio/staff-reminders/missed-clock-out-reminder.mp3', 'audio/staff-reminders/missed-clock-out-reminder.mp3',
 'warning', true, true),

('Near Geo-Fence Warning', 'near_geo_fence',
 'You are approaching the edge of the approved work zone.',
 'Your device indicates you are near the geo-fence boundary. Please stay within the approved work area.',
 '/audio/staff-reminders/near-geofence-warning.mp3', 'audio/staff-reminders/near-geofence-warning.mp3',
 'warning', true, true),

('Suspicious Location Warning', 'suspicious_location',
 'Your clock-in location does not match the expected work area.',
 'A clock-in was attempted from an unusual or suspicious location. Please verify your location and try again.',
 '/audio/staff-reminders/suspicious-location-warning.mp3', 'audio/staff-reminders/suspicious-location-warning.mp3',
 'critical', true, true),

('Successful Clock-In', 'successful_clock_in',
 'You are clocked in and officially on the clock. Let us get started.',
 'Your clock-in was successful. Your shift has begun.',
 '/audio/staff-reminders/successful-clock-in.mp3', 'audio/staff-reminders/successful-clock-in.mp3',
 'positive', true, true),

('Successful Clock-Out', 'successful_clock_out',
 'Clocked out successfully. Rest up, you have earned it.',
 'Your clock-out was successful. Thank you for your shift today.',
 '/audio/staff-reminders/successful-clock-out.mp3', 'audio/staff-reminders/successful-clock-out.mp3',
 'positive', true, true),

-- App Alerts
('All Tasks Complete', 'all_tasks_complete',
 'Every checklist and task for the day is done. Clean sweep.',
 'All assigned tasks and checklists for the day have been completed.',
 '/audio/app-alerts/all-tasks-complete.mp3', 'audio/app-alerts/all-tasks-complete.mp3',
 'positive', true, true),

('App Sync Failed', 'app_sync_failed',
 'Could not sync with the server. Your data may not be up to date.',
 'The application was unable to sync with the server. Please check your connection and try again.',
 '/audio/app-alerts/app-sync-failed.mp3', 'audio/app-alerts/app-sync-failed.mp3',
 'critical', true, true),

('Break Over Reminder', 'break_over',
 'Break time is over. Time to get back to work.',
 'Your scheduled break has ended. Please return to your assigned duties.',
 '/audio/app-alerts/break-over-reminder.mp3', 'audio/app-alerts/break-over-reminder.mp3',
 'reminder', true, true),

('Break Reminder', 'break_reminder',
 'Time for a break. Step away, reset, and recharge.',
 'You are due for a scheduled break. Please take your break at the designated time.',
 '/audio/app-alerts/break-reminder.mp3', 'audio/app-alerts/break-reminder.mp3',
 'reminder', true, true),

('End of Shift Reminder', 'end_of_shift',
 'Your shift is ending soon. Wrap up and get ready to clock out.',
 'Your shift is approaching its end time. Please complete any outstanding tasks and prepare to clock out.',
 '/audio/app-alerts/end-of-shift-reminder.mp3', 'audio/app-alerts/end-of-shift-reminder.mp3',
 'reminder', true, true),

('Idle Reminder', 'idle_reminder',
 'No activity detected. Are you still there?',
 'No activity has been detected for a period of time. Please interact with the app to confirm you are still on duty.',
 '/audio/app-alerts/idle-reminder.mp3', 'audio/app-alerts/idle-reminder.mp3',
 'warning', true, true),

('Location Permission Reminder', 'location_permission',
 'Location access is required to clock in. Please enable it.',
 'Clock-in requires location permission. Please enable location services to clock in for your shift.',
 '/audio/app-alerts/location-permission-reminder.mp3', 'audio/app-alerts/location-permission-reminder.mp3',
 'reminder', true, true),

('Low Battery Reminder', 'low_battery',
 'Your device battery is running low. Please charge soon.',
 'Your device battery level is low. Please charge your device to ensure uninterrupted shift operations.',
 '/audio/app-alerts/low-battery-reminder.mp3', 'audio/app-alerts/low-battery-reminder.mp3',
 'warning', true, true),

-- Manager Alerts
('Geo-Fence Alert', 'geo_fence_alert',
 'A staff member clocked in outside the approved geo-fence.',
 'A staff clock-in was detected outside the approved geo-fence area. Please review and follow up.',
 '/audio/manager-alerts/geofence-alert.mp3', 'audio/manager-alerts/geofence-alert.mp3',
 'critical', true, true),

('Late Alert', 'manager_late_alert',
 'A staff member is late for their scheduled shift.',
 'A staff member has clocked in late. Please review and take appropriate action.',
 '/audio/manager-alerts/late-alert.mp3', 'audio/manager-alerts/late-alert.mp3',
 'warning', true, true),

('Missed Walkthrough', 'manager_missed_walkthrough',
 'A staff member missed a required opening or closing walkthrough.',
 'A required walkthrough was not completed. Please check with the assigned staff member.',
 '/audio/manager-alerts/missed-walkthrough.mp3', 'audio/manager-alerts/missed-walkthrough.mp3',
 'warning', true, true),

('Safety Alert', 'manager_safety_alert',
 'A safety issue or incident has been reported.',
 'A safety incident has been reported and requires your attention.',
 '/audio/manager-alerts/safety-alert.mp3', 'audio/manager-alerts/safety-alert.mp3',
 'critical', true, true),

('Task Overdue', 'manager_task_overdue',
 'A task or ticket has passed its due time.',
 'A task is overdue and requires attention.',
 '/audio/manager-alerts/task-overdue.mp3', 'audio/manager-alerts/task-overdue.mp3',
 'warning', true, true),

-- Leaderboard & EOTM Alerts
('Employee of the Month Nomination', 'eom_nomination',
 'You have been nominated for Employee of the Month!',
 'Congratulations! You have been nominated for Employee of the Month based on your performance.',
 '/audio/leaderboard-alerts/eom-nomination.mp3', 'audio/leaderboard-alerts/eom-nomination.mp3',
 'positive', true, true),

('Employee of the Month Winner', 'eom_winner',
 'Congratulations! You are Employee of the Month!',
 'You have been awarded Employee of the Month! Your hard work and dedication have been recognized.',
 '/audio/leaderboard-alerts/eom-winner.mp3', 'audio/leaderboard-alerts/eom-winner.mp3',
 'celebration', true, true),

('Leaderboard Jump', 'leaderboard_jump',
 'You moved up in the leaderboard rankings. Keep it up!',
 'Your ranking on the leaderboard has improved. Keep earning points and climbing the ranks.',
 '/audio/leaderboard-alerts/leaderboard-jump.mp3', 'audio/leaderboard-alerts/leaderboard-jump.mp3',
 'positive', true, true),

('Points Deducted', 'points_deducted',
 'Points have been deducted from your account.',
 'Points were deducted due to a policy event. Review the details in your points history.',
 '/audio/leaderboard-alerts/points-deducted.mp3', 'audio/leaderboard-alerts/points-deducted.mp3',
 'warning', true, true),

('Top Five Alert', 'top_five',
 'You are in the top five of the leaderboard!',
 'You have entered the top five on the leaderboard. Keep up the great work!',
 '/audio/leaderboard-alerts/top-five-alert.mp3', 'audio/leaderboard-alerts/top-five-alert.mp3',
 'positive', true, true),

-- Badge & Recognition Alerts
('Badge Earned', 'badge_earned',
 'You earned a recognition badge! Check your profile.',
 'A recognition badge has been awarded to you. Check the Recognition page for details.',
 '/audio/badge-alerts/badge-earned.mp3', 'audio/badge-alerts/badge-earned.mp3',
 'positive', true, true),

('Above & Beyond Badge', 'badge_above_beyond',
 'You earned the Above & Beyond badge for exceptional effort!',
 'The Above & Beyond badge recognizes major contributions outside normal expectations.',
 '/audio/badge-alerts/above-beyond-badge.mp3', 'audio/badge-alerts/above-beyond-badge.mp3',
 'celebration', true, true),

('Always On Time Badge', 'badge_always_on_time',
 'You earned the Always On Time badge for perfect punctuality!',
 'The Always On Time badge recognizes arriving on time for every scheduled shift.',
 '/audio/badge-alerts/always-on-time-badge.mp3', 'audio/badge-alerts/always-on-time-badge.mp3',
 'positive', true, true),

('Checklist Champion Badge', 'badge_checklist_champion',
 'You earned the Checklist Champion badge for accurate checklists!',
 'The Checklist Champion badge recognizes accurate and consistent checklist completion.',
 '/audio/badge-alerts/checklist-champion-badge.mp3', 'audio/badge-alerts/checklist-champion-badge.mp3',
 'positive', true, true),

('Event Ready Badge', 'badge_event_ready',
 'You earned the Event Ready badge for supporting events!',
 'The Event Ready badge recognizes helping prepare the building for events and services.',
 '/audio/badge-alerts/event-ready-badge.mp3', 'audio/badge-alerts/event-ready-badge.mp3',
 'positive', true, true),

('Growth Mindset Badge', 'badge_growth_mindset',
 'You earned the Growth Mindset badge for showing improvement!',
 'The Growth Mindset badge recognizes improvement, learning, and coachability.',
 '/audio/badge-alerts/growth-mindset-badge.mp3', 'audio/badge-alerts/growth-mindset-badge.mp3',
 'positive', true, true),

('Perfect Attendance Badge', 'badge_perfect_attendance',
 'You earned the Perfect Attendance badge!',
 'The Perfect Attendance badge recognizes completing all scheduled shifts without absence.',
 '/audio/badge-alerts/perfect-attendance-badge.mp3', 'audio/badge-alerts/perfect-attendance-badge.mp3',
 'celebration', true, true),

('Pristine Space Badge', 'badge_pristine_space',
 'You earned the Pristine Space badge for keeping areas clean!',
 'The Pristine Space badge recognizes keeping assigned areas consistently clean and inspection-ready.',
 '/audio/badge-alerts/pristine-space-badge.mp3', 'audio/badge-alerts/pristine-space-badge.mp3',
 'positive', true, true),

('Reset Champion Badge', 'badge_reset_champion',
 'You earned the Reset Champion badge for restoring spaces!',
 'The Reset Champion badge recognizes restoring the building after events quickly and properly.',
 '/audio/badge-alerts/reset-champion-badge.mp3', 'audio/badge-alerts/reset-champion-badge.mp3',
 'positive', true, true),

('Safety Watch Badge', 'badge_safety_watch',
 'You earned the Safety Watch badge for keeping the building safe!',
 'The Safety Watch badge recognizes identifying and reporting safety concerns.',
 '/audio/badge-alerts/safety-watch-badge.mp3', 'audio/badge-alerts/safety-watch-badge.mp3',
 'positive', true, true),

('Secure Building Badge', 'badge_secure_building',
 'You earned the Secure Building badge for security excellence!',
 'The Secure Building badge recognizes following opening, closing, and security procedures correctly.',
 '/audio/badge-alerts/secure-building-badge.mp3', 'audio/badge-alerts/secure-building-badge.mp3',
 'positive', true, true),

('Self-Starter Badge', 'badge_self_starter',
 'You earned the Self-Starter badge for taking initiative!',
 'The Self-Starter badge recognizes taking initiative without always being told what to do.',
 '/audio/badge-alerts/self-starter-badge.mp3', 'audio/badge-alerts/self-starter-badge.mp3',
 'positive', true, true),

('Team Player Badge', 'badge_team_player',
 'You earned the Team Player badge for teamwork!',
 'The Team Player badge recognizes helping coworkers and contributing to a respectful work environment.',
 '/audio/badge-alerts/team-player-badge.mp3', 'audio/badge-alerts/team-player-badge.mp3',
 'positive', true, true),

-- Safety & Security Alerts
('Blocked Exit Warning', 'blocked_exit',
 'A blocked or obstructed exit has been detected.',
 'Please check and clear any blocked exits to ensure safety compliance.',
 '/audio/safety-alerts/blocked-exit-warning.mp3', 'audio/safety-alerts/blocked-exit-warning.mp3',
 'critical', true, true),

('Hazard Reminder', 'hazard_reminder',
 'Reminder to check for or address a safety hazard.',
 'Please inspect your area for any safety hazards and address them immediately.',
 '/audio/safety-alerts/hazard-reminder.mp3', 'audio/safety-alerts/hazard-reminder.mp3',
 'warning', true, true),

('Safety Issue Reported', 'safety_issue_reported',
 'A safety issue has been reported by a staff member.',
 'A safety issue has been reported and requires review.',
 '/audio/safety-alerts/safety-issue-reported.mp3', 'audio/safety-alerts/safety-issue-reported.mp3',
 'critical', true, true),

('Security Issue Reported', 'security_issue_reported',
 'A security issue has been reported.',
 'A security issue has been reported and requires immediate attention.',
 '/audio/safety-alerts/security-issue-reported.mp3', 'audio/safety-alerts/security-issue-reported.mp3',
 'critical', true, true),

-- Task Alerts
('Note Required', 'task_note_required',
 'A note or comment is required to complete this task.',
 'Please add a note or comment to the task before marking it complete.',
 '/audio/task-alerts/note-required.mp3', 'audio/task-alerts/note-required.mp3',
 'reminder', true, true),

('Photo Required', 'task_photo_required',
 'A photo is required to complete this task.',
 'Please take and attach a photo to complete the task.',
 '/audio/task-alerts/photo-required.mp3', 'audio/task-alerts/photo-required.mp3',
 'reminder', true, true),

('Task Assigned', 'task_assigned',
 'A new task has been assigned to you.',
 'A new task has been assigned. Please review and begin work.',
 '/audio/task-alerts/task-assigned.mp3', 'audio/task-alerts/task-assigned.mp3',
 'info', true, true),

('Task Completed', 'task_completed',
 'A task has been marked as complete.',
 'A task has been completed. Great work!',
 '/audio/task-alerts/task-completed.mp3', 'audio/task-alerts/task-completed.mp3',
 'positive', true, true),

('Task Due Soon', 'task_due_soon',
 'A task is approaching its due time.',
 'A task assigned to you is due soon. Please complete it before the deadline.',
 '/audio/task-alerts/task-due-soon.mp3', 'audio/task-alerts/task-due-soon.mp3',
 'reminder', true, true),

('Task Overdue', 'task_overdue',
 'A task has passed its due time.',
 'A task assigned to you is now overdue. Please complete it as soon as possible.',
 '/audio/task-alerts/task-overdue.mp3', 'audio/task-alerts/task-overdue.mp3',
 'warning', true, true),

('Urgent Task', 'urgent_task',
 'An urgent task requires your immediate attention.',
 'An urgent task has been assigned. Please address it immediately.',
 '/audio/task-alerts/urgent-task.mp3', 'audio/task-alerts/urgent-task.mp3',
 'critical', true, true),

-- Walkthrough & Checklist Alerts
('Checklist Incomplete', 'checklist_incomplete',
 'A checklist was submitted incomplete.',
 'Please review the incomplete checklist and address the missing items.',
 '/audio/walkthrough-alerts/checklist-incomplete.mp3', 'audio/walkthrough-alerts/checklist-incomplete.mp3',
 'warning', true, true),

('Closing Walkthrough Reminder', 'closing_walkthrough',
 'Reminder to complete the closing walkthrough.',
 'The closing walkthrough is due. Please complete it before the end of your shift.',
 '/audio/walkthrough-alerts/closing-walkthrough-reminder.mp3', 'audio/walkthrough-alerts/closing-walkthrough-reminder.mp3',
 'reminder', true, true),

('Door Check Missing', 'door_check_missing',
 'A required door check has not been completed.',
 'One or more door checks have not been completed. Please verify all doors are secure.',
 '/audio/walkthrough-alerts/door-check-missing.mp3', 'audio/walkthrough-alerts/door-check-missing.mp3',
 'warning', true, true),

('Opening Walkthrough Reminder', 'opening_walkthrough',
 'Reminder to complete the opening walkthrough.',
 'The opening walkthrough is due. Please complete it before the start of operations.',
 '/audio/walkthrough-alerts/opening-walkthrough-reminder.mp3', 'audio/walkthrough-alerts/opening-walkthrough-reminder.mp3',
 'reminder', true, true),

('Security Check Reminder', 'security_check',
 'Reminder to perform a security check.',
 'A routine security check is due. Please complete the security inspection.',
 '/audio/walkthrough-alerts/security-check-reminder.mp3', 'audio/walkthrough-alerts/security-check-reminder.mp3',
 'reminder', true, true)

ON CONFLICT (reminder_type) DO UPDATE SET
  audio_url = EXCLUDED.audio_url,
  audio_storage_path = EXCLUDED.audio_storage_path,
  short_text = EXCLUDED.short_text,
  full_text = EXCLUDED.full_text,
  updated_at = NOW();

SELECT 'Audio reminder wiring applied successfully.' as status;
