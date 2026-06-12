# Supabase Setup Guide

## Required Environment Variables

Add these to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Setup

> NOTE: `supabase/schema.sql` is the **legacy** full schema and is no longer the
> source of truth. Do NOT run it on a fresh project — it conflicts with the
> canonical schema. Use the ordered migration list below instead.

Run these files in the Supabase SQL Editor **in this exact order**. Every file is
idempotent (`IF NOT EXISTS` / guarded policy creates), so re-running is safe.

### 1. Base schema (required)
1. `supabase/schema-canonical.sql`
   — profiles, events, shifts, walkthroughs, incidents, breaks,
   maintenance_tickets, messages, staff_assignments, notifications,
   group_conversations (+ participants/messages/reads), staff_directory,
   visitor_volume. Also creates the `employee-uploads` storage bucket,
   the `public.get_user_role()` helper, and the `handle_new_user` trigger.

### 2. Feature tables (required for full functionality)
2. `supabase/fix-permissions-audit.sql`            — audit_logs (+ idempotent messaging re-checks)
3. `supabase/recognition-gamification-migration.sql` — badges, points, leaderboards, nominations + views
4. `supabase/operations-brief-safe.sql`            — operations_brief_issues/sections/assets + view
5. `supabase/daily-brief-payroll-migration.sql`    — daily_brief_issues/sections, staff_pay_rates, payroll_reports
6. `supabase/sop-documents-migration.sql`          — sop_documents
7. `supabase/supplies-vendors-equipment-migration.sql` — supplies, vendors, equipment
8. `supabase/user-sessions-migration.sql`          — user_sessions + v_staff_online_status view
9. `supabase/manager-alerts.sql`                   — manager_alerts
10. `supabase/wake-up-alarm.sql`                   — staff_wake_up_alarms

### 3. Archive tables (history / "Clear" features)
11. `supabase/archive-migration.sql`               — messages_archive, group_messages_archive, incidents_archive, archive_runs
12. `supabase/notifications-archive-migration.sql` — notifications_archive, manager_alerts_archive
13. `supabase/ticket-archive-migration.sql`        — ticket_archive
14. `supabase/walkthrough-archive-migration.sql`   — walkthrough_archive
15. `supabase/walkthrough-is-test-migration.sql`   — adds is_test column
16. `supabase/visitor-volume-archive-migration.sql` — visitor_volume_archive

### 4. Constraint / column alters
17. `supabase/migrations/001_employee_schedules.sql`
18. `supabase/migrations/20260601_staff_assignments_unique.sql`
19. `supabase/migrations/20260601_shifts_location_type.sql`
20. `supabase/migrations/20260601_marketing_archive_public.sql`

### 5. Realtime + optional follow-ups
21. `supabase/enable-realtime-notifications.sql`   — realtime bell
22. `supabase/badge-point-rules-migration.sql`, `supabase/badge-images-migration.sql` (recognition tweaks)
23. `supabase/seed.sql` / `supabase/seed-events.sql` — demo data (optional)

The `employee-uploads` storage bucket is created automatically by step 1.

## Google Sheets Sync

The `scripts/google-sheets-sync.js` script runs in Google Apps Script. Set credentials via:
**Extensions → Apps Script → Project Settings → Script Properties**

Add:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_KEY` — your Supabase anon key

Then use the "Supabase Sync" menu in Sheets to sync.

## GOA Calendar Sync

Run `python scripts/sync_calendars.py` to fetch today's GOA chapel data.
Requires: `pip install requests beautifulsoup4`
