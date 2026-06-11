# Shrine Ops — Implementation Plan

> **Generated:** 2026-04-01  
> **Status:** Active  
> **Tech Stack:** Next.js 14.2.35, React 18, TypeScript, Tailwind 3.4, Supabase (PostgreSQL + Auth + Storage), Lucide React

---

## Phases Overview

| Phase | Focus | Priority | Est. Effort |
|-------|-------|----------|-------------|
| **Phase 1** | Critical bugs + missing core features | P0 — Blockers | ~3-4 days |
| **Phase 2** | Important but not blocking | P1 — Should-have | ~3-4 days |
| **Phase 3** | Nice-to-have / future | P2 — Could-have | ~5-7 days |

---

## Phase 1: Critical Bugs + Missing Core Features

> These items block the spec from being met. Database changes must be done first, then server actions, then UI.

---

### 1.1 P2P Messaging System

**Status:** Completely missing — no `messages` table, no chat UI, no real-time.

#### 1.1.1 Database — `messages` table
- **File:** `supabase/schema.sql`
- **Changes:** Add `messages` table with columns: `id (UUID PK)`, `sender_id (UUID FK → auth.users)`, `recipient_id (UUID FK → auth.users)`, `content (TEXT NOT NULL)`, `media_urls (JSONB DEFAULT '[]')`, `read_at (TIMESTAMPTZ)`, `created_at (TIMESTAMPTZ DEFAULT NOW())`. Add indexes on `(sender_id, recipient_id)`, `(recipient_id, created_at DESC)`. Add RLS policies: users can SELECT messages where they are sender or recipient; users can INSERT only as sender_id = auth.uid().
- **Complexity:** M

#### 1.1.2 Server Action — messaging actions
- **File:** `lib/actions/messages.ts` (NEW)
- **Functions:**
  - `sendMessage(recipientId: string, content: string, mediaUrls?: string[])` — inserts message, returns created record
  - `getConversations()` — returns list of unique conversation partners with last message and unread count, joined with `profiles` for names
  - `getMessagesWithUser(userId: string, limit?: number)` — returns messages between current user and `userId`, ordered by `created_at ASC`, joined with `profiles`
  - `markMessagesAsRead(conversationPartnerId: string)` — sets `read_at = NOW()` on unread messages where `recipient_id = auth.uid()` and `sender_id = partnerId`
- **Complexity:** M

#### 1.1.3 UI — Messaging page
- **File:** `app/messages/page.tsx` (NEW)
- **Components:** Server page fetching `getConversations()`, client component for chat UI with message list, input, send button. Real-time via Supabase channels on `messages` table.
- **Complexity:** L

#### 1.1.4 UI — Chat components
- **File:** `components/messaging/ConversationList.tsx` (NEW)
- **File:** `components/messaging/ChatWindow.tsx` (NEW)
- **File:** `components/messaging/MessageBubble.tsx` (NEW)
- **Details:** ConversationList shows contacts with last message preview and unread badge. ChatWindow shows message thread with timestamps, read receipts. MessageBubble renders sent/received with different alignment and styling.
- **Complexity:** L

#### 1.1.5 UI — Bottom nav update
- **File:** `components/layout/BottomNav.tsx`
- **Changes:** Add Messages tab icon (use Lucide `MessageSquare`) between Calendar and Manager tabs.
- **Complexity:** S

#### 1.1.6 Middleware update
- **File:** `app/middleware.ts`
- **Changes:** Add `/messages` to auth-guarded paths.
- **Complexity:** S

---

### 1.2 Staffing Rule Enforcement

**Status:** Completely missing — no validation that enough staff assigned, no gap alerts.

#### 1.2.1 Database — `staff_assignments` table
- **File:** `supabase/schema.sql`
- **Changes:** Add `staff_assignments` table: `id (UUID PK)`, `event_id (BIGINT FK → events)`, `user_id (UUID FK → auth.users)`, `role_assigned (TEXT CHECK IN ('operations','security','greeter','director'))`, `shift_start (TIMESTAMPTZ)`, `shift_end (TIMESTAMPTZ)`, `created_at`. Unique constraint on `(event_id, user_id)`. Indexes on `(event_id)`, `(user_id, shift_start)`. RLS: managers can INSERT/UPDATE/DELETE; all authenticated can SELECT their own assignments or all if manager.
- **Complexity:** M

#### 1.2.2 Server Action — staffing validation
- **File:** `lib/actions/staffing.ts` (NEW)
- **Functions:**
  - `validateStaffingForEvent(eventId: number)` — compares required_ops/security/greeter/director_mandatory against actual assignments. Returns `{ sufficient: boolean, gaps: { role: string, needed: number, assigned: number }[] }`
  - `getStaffingGaps(dateFrom?: string, dateTo?: string)` — returns all events with staffing gaps in date range
  - `assignStaffToEvent(eventId: number, userId: string, role: string)` — creates assignment, validates no double-booking
- **Complexity:** M

#### 1.2.3 UI — Gap alerts on calendar
- **File:** `app/calendar/page.tsx`
- **Changes:** Import and call `getStaffingGaps()` for current month. Render gap badges on calendar day cells that have understaffed events.
- **Complexity:** M

#### 1.2.4 UI — Staffing gap component
- **File:** `components/calendar/StaffingGapBadge.tsx` (NEW)
- **Details:** Small badge showing "1 Ops short" or "2 Security needed" in red/amber.
- **Complexity:** S

#### 1.2.5 UI — Manager staffing panel
- **File:** `app/manager/page.tsx`
- **Changes:** Add staffing gap section above StaffTable. Show events with gaps, allow quick-assign from dropdown.
- **Complexity:** M

---

### 1.3 Signup Role Selection

**Status:** Auto-assigns `'operations'` via trigger, no role picker on signup form.

#### 1.3.1 Database — Modify signup trigger
- **File:** `supabase/schema.sql`
- **Changes:** Modify `handle_new_user()` trigger to accept a `role` parameter from `raw_user_meta_data`. If `NEW.raw_user_meta_data->>'role'` is set and valid, use it; otherwise default to `'operations'`.
- **Complexity:** S

#### 1.3.2 Server Action — signup with role
- **File:** `lib/actions/auth.ts` (NEW)
- **Functions:**
  - `signUpWithEmail(email: string, password: string, role: 'operations' | 'security' | 'manager')` — calls `supabase.auth.signUp()` with `options: { data: { role } }` so trigger picks it up
- **Complexity:** S

#### 1.3.3 UI — Role picker on login/signup
- **File:** `app/login/page.tsx`
- **Changes:** Add role selector dropdown/radio buttons visible only when `isSignUp === true`. Options: Operations, Security, Manager (manager may require a code — see 1.3.4). Pass selected role to `signUpWithEmail()`.
- **Complexity:** M

#### 1.3.4 UI — Manager signup code (optional gate)
- **File:** `app/login/page.tsx`
- **Changes:** When "Manager" role selected, show additional input for manager invite code. Validate against env var `NEXT_PUBLIC_MANAGER_INVITE_CODE` client-side before allowing signup.
- **Complexity:** S

---

### 1.4 Geofence Server-Side Enforcement

**Status:** Client-side only — `app/api/clock/route.ts` and `lib/actions/clock-in.ts` accept lat/lon but never validate.

#### 1.4.1 Database — Site coordinates config
- **File:** `supabase/schema.sql`
- **Changes:** Add `site_config` table: `id (INT PK DEFAULT 1)`, `site_name (TEXT)`, `latitude (DOUBLE PRECISION)`, `longitude (DOUBLE PRECISION)`, `geofence_radius_meters (INT DEFAULT 275)`. Insert single row with actual shrine coordinates. Or simpler: store as env vars `SITE_LAT`, `SITE_LON`, `GEOFENCE_RADIUS`.
- **Recommendation:** Use env vars to avoid DB round-trip. Add to `.env.local`: `SITE_LAT`, `SITE_LON`, `GEOFENCE_RADIUS=275`.
- **Complexity:** S

#### 1.4.2 Server Action — geofence-validated clock-in
- **File:** `lib/actions/clock-in.ts`
- **Changes:** Import `checkGeofence` from `lib/geofence.ts`. In `clockIn()`, read `SITE_LAT`, `SITE_LON`, `GEOFENCE_RADIUS` from env. Call `checkGeofence(lat, lon, siteLat, siteLon, radius)`. If `!result.inRange`, throw `Error("Clock-in rejected: outside geofence boundary")`. Also validate that `lat` and `lon` are reasonable numbers (not 0,0 or NaN).
- **Complexity:** S

#### 1.4.3 API Route — geofence-validated clock-in
- **File:** `app/api/clock/route.ts`
- **Changes:** Same validation in POST handler. Read env vars, call `checkGeofence`, reject if out of range.
- **Complexity:** S

#### 1.4.4 Geofence — move coordinates to config
- **File:** `lib/geofence.ts`
- **Changes:** Remove hardcoded Chicago coords. Export a `getSiteLocation()` helper that reads from env vars.
- **Complexity:** S

---

### 1.5 Overtime Threshold Fix

**Status:** Inconsistent — `lib/labor-math.ts` uses 7.5h, `lib/actions/overtime-analysis.ts` uses 8h.

#### 1.5.1 Fix overtime-analysis.ts
- **File:** `lib/actions/overtime-analysis.ts`
- **Changes:** Import `SHIFT_LENGTH_HOURS` from `lib/labor-math.ts` (or define a shared constant). Change `isOvertime: paid > 8` to `isOvertime: paid > SHIFT_LENGTH_HOURS` (7.5h).
- **Complexity:** S

#### 1.5.2 Fix manager page overtime display
- **File:** `app/manager/page.tsx`
- **Changes:** Verify the overtime alerts section uses the corrected threshold. The `analyzeOvertime` call on line 23 will now be consistent.
- **Complexity:** S

---

## Phase 2: Important But Not Blocking

### 2.1 Operating Hours Enforcement

**Status:** No middleware time check, no enforcement of 9AM-5PM site / 10AM-5PM public hours.

#### 2.1.1 Server Action — operating hours check
- **File:** `lib/actions/clock-in.ts`
- **Changes:** Add `validateOperatingHours(clockInTime: Date)` helper. Site hours: 9:00-17:00. Reject clock-in before 9AM or after 5PM with descriptive error. Allow manager override via a flag.
- **Complexity:** S

#### 2.1.2 API Route — operating hours check
- **File:** `app/api/clock/route.ts`
- **Changes:** Same validation in POST handler.
- **Complexity:** S

#### 2.1.3 UI — Operating hours info
- **File:** `app/dashboard/page.tsx`
- **Changes:** Display operating hours banner in DailyBrief or as a standalone info card.
- **Complexity:** S

---

### 2.2 After-Hours Event Rules

**Status:** No logic for post-5pm staffing (min 1 Ops + 1 Security).

#### 2.2.1 Server Action — after-hours validation
- **File:** `lib/actions/staffing.ts`
- **Changes:** In `validateStaffingForEvent()`, add check: if `event.end_time` hour >= 17 (5PM), require at least 1 ops + 1 security assigned for after-hours coverage. Include in gap report.
- **Complexity:** S

#### 2.2.2 UI — After-hours indicator
- **File:** `components/calendar/StaffingGapBadge.tsx`
- **Changes:** Add "After-hours coverage missing" variant.
- **Complexity:** S

---

### 2.3 7.5h Shift Limit Enforcement

**Status:** No hard block, no server-side validation.

#### 2.3.1 Server Action — shift duration check
- **File:** `lib/actions/clock-in.ts`
- **Changes:** In `clockIn()`, query for user's active (unclocked) shift. If one exists and has been running > 7.5h, reject new clock-in. Also check: if user has already clocked 7.5h today (sum of completed shifts), warn or block.
- **Complexity:** M

#### 2.3.2 UI — Shift limit warning
- **File:** `components/dashboard/ShiftTimer.tsx`
- **Changes:** When approaching 7.5h (e.g., 7h), show amber warning. At 7.5h, show red alert with "Shift limit reached — notify manager" message.
- **Complexity:** S

---

### 2.4 Visitor Volume Data Model

**Status:** Static hardcoded chart on manager page, no data model.

#### 2.4.1 Database — `visitor_counts` table
- **File:** `supabase/schema.sql`
- **Changes:** Add `visitor_counts` table: `id (UUID PK)`, `event_id (BIGINT FK → events, nullable)`, `counted_at (TIMESTAMPTZ NOT NULL)`, `count (INT NOT NULL)`, `sector (TEXT)`, `recorded_by (UUID FK → auth.users)`. Indexes on `(counted_at)`, `(event_id, counted_at)`. RLS: all authenticated can SELECT; operations/security can INSERT; managers can UPDATE/DELETE.
- **Complexity:** M

#### 2.4.2 Server Action — visitor count actions
- **File:** `lib/actions/visitors.ts` (NEW)
- **Functions:**
  - `recordVisitorCount(count: number, sector?: string, eventId?: number)` — inserts record
  - `getVisitorVolumeForDate(date: string)` — returns hourly/daily aggregated counts
  - `getVisitorVolumeRange(dateFrom: string, dateTo: string)` — returns time-series data for chart
- **Complexity:** M

#### 2.4.3 UI — Visitor count input
- **File:** `app/dashboard/page.tsx`
- **Changes:** Add quick "Record visitor count" form in Quick Actions sidebar for operations staff.
- **Complexity:** M

#### 2.4.4 UI — Visitor volume chart (manager page)
- **File:** `app/manager/page.tsx`
- **Changes:** Replace hardcoded bar chart with data from `getVisitorVolumeForDate()`. Use actual visitor counts. Keep the bar chart visual but make it dynamic.
- **Complexity:** M

---

### 2.5 StaffTable — Show Names Instead of UUIDs

**Status:** Shows `member.id.slice(0, 8)` instead of staff names.

#### 2.5.1 Server-side data fetch
- **File:** `app/manager/page.tsx`
- **Changes:** Modify shifts query to join with `profiles`: `.select("*, profiles(full_name, email, role), events(title)")`. Pass profile data to StaffTable.
- **Complexity:** S

#### 2.5.2 StaffTable component update
- **File:** `components/manager/StaffTable.tsx`
- **Changes:** Update `Shift` interface to include `profiles: { full_name: string; email: string; role: string } | null`. Replace `member.id.slice(0, 8)` with `member.profiles?.full_name ?? member.email ?? member.id.slice(0, 8)`. Show role as badge.
- **Complexity:** S

---

### 2.6 ProfileCard — Show Role

**Status:** Hardcoded "Staff Member" text, doesn't read from profiles table.

#### 2.6.1 ProfileCard component update
- **File:** `components/profile/ProfileCard.tsx`
- **Changes:** Accept `profile` prop alongside `user`. Replace hardcoded "Staff Member" with `profile?.role` formatted (capitalize first letter). Add role badge with color coding: operations=primary, security=tertiary, manager=secondary.
- **Complexity:** S

#### 2.6.2 Profile page data fetch
- **File:** `app/profile/page.tsx`
- **Changes:** Ensure profile data is passed to ProfileCard. Already fetched on line 30-33 of dashboard — verify same pattern.
- **Complexity:** S

---

### 2.7 MaintenanceTicketForm — File Upload Fix

**Status:** File picker selects files but never uploads them. `createTicket()` call on line 32 doesn't pass `mediaUrls`.

#### 2.7.1 MaintenanceTicketForm — wire up upload
- **File:** `components/forms/MaintenanceTicketForm.tsx`
- **Changes:**
  1. Store selected `File[]` objects in state (not just names)
  2. On submit, if files exist, POST to `/api/upload` with FormData
  3. Collect returned URLs and pass as `mediaUrls` to `createTicket()`
  4. Show upload progress / error states
- **Complexity:** M

#### 2.7.2 Upload API — fix private bucket URL
- **File:** `app/api/upload/route.ts`
- **Changes:** The bucket `employee-uploads` is private (line 379 of schema.sql). `getPublicUrl()` will not work. Use `createSignedUrl()` instead, or create signed URLs on-demand. Alternatively, change bucket to public if appropriate.
- **Complexity:** S

---

### 2.8 Remove Dead Code

**Status:** `app/layout_new.tsx` is dead code.

#### 2.8.1 Delete dead file
- **File:** `app/layout_new.tsx`
- **Action:** Delete the file.
- **Complexity:** S

---

## Phase 3: Nice-to-Have / Future

### 3.1 Push Notification System

**Status:** No notification system at all. Spec calls for 30min-before shift push notifications.

#### 3.1.1 Database — `notifications` table
- **File:** `supabase/schema.sql`
- **Changes:** Add `notifications` table: `id (UUID PK)`, `user_id (UUID FK)`, `type (TEXT CHECK IN ('shift_reminder','staffing_gap','incident_alert','maintenance_update','message'))`, `title (TEXT)`, `body (TEXT)`, `read (BOOLEAN DEFAULT false)`, `data (JSONB)`, `created_at`. RLS: users see their own notifications.
- **Complexity:** M

#### 3.1.2 Server Action — notification CRUD
- **File:** `lib/actions/notifications.ts` (NEW)
- **Functions:** `createNotification()`, `getUnreadCount()`, `markAsRead()`, `getNotifications()`
- **Complexity:** M

#### 3.1.3 Server Action — shift reminder scheduler
- **File:** `lib/actions/notifications.ts`
- **Changes:** Add `checkAndSendShiftReminders()` — queries shifts starting in next 30min, creates notification records. To be called from cron/edge function.
- **Complexity:** M

#### 3.1.4 UI — Notification bell
- **File:** `components/layout/NotificationBell.tsx` (NEW)
- **File:** `components/layout/BottomNav.tsx`
- **Changes:** Add bell icon to top bar or bottom nav with unread badge. Click opens notification drawer.
- **Complexity:** M

#### 3.1.5 Web Push setup
- **File:** `app/sw.ts` (NEW) — Service Worker for push
- **File:** `lib/actions/notifications.ts` — VAPID key management, subscription storage
- **Complexity:** L

---

### 3.2 GOA Calendar Sync

**Status:** `scripts/sync_calendars.py` is an empty stub.

#### 3.2.1 Implement sync script
- **File:** `scripts/sync_calendars.py`
- **Changes:**
  1. Fetch GOA iCal from `https://www.goarch.org/chapel/calendar/ical`
  2. Parse events, identify major feasts (cross-reference with GOA feast day list)
  3. For major feasts, set `director_mandatory=true`, `required_ops=3`, `required_security=3`, `required_greeter=1`
  4. Generate Digital Chant Stand link (GOA chapel URL for the day)
  5. Upsert to Supabase `events` table (match by date+title to avoid duplicates)
- **Dependencies:** `icalendar`, `supabase-py`, `requests`
- **Complexity:** L

#### 3.2.2 Google Calendar sync (optional)
- **File:** `scripts/sync_calendars.py`
- **Changes:** Add Google Calendar API integration as secondary source.
- **Complexity:** L

#### 3.2.3 Scheduling
- **File:** `scripts/sync_calendars.py` or external cron
- **Changes:** Set up daily cron (e.g., GitHub Actions scheduled workflow, Vercel cron, or system cron) to run sync.
- **Complexity:** M

---

### 3.3 Overtime Auto-Reduction

**Status:** Analysis only, no optimization.

#### 3.3.1 Server Action — schedule optimizer
- **File:** `lib/actions/schedule-optimizer.ts` (NEW)
- **Functions:**
  - `analyzeWeeklyOvertime(weekStart: string)` — identifies staff approaching/exceeding 7.5h daily or 40h weekly
  - `suggestScheduleAdjustments(eventId: number)` — suggests reassignments to reduce overtime
  - `getOvertimeRiskReport()` — per-staff risk scores
- **Complexity:** L

#### 3.3.2 UI — Manager optimization panel
- **File:** `app/manager/page.tsx`
- **Changes:** Add "Schedule Optimization" section showing suggestions. Add "Apply Suggestions" button.
- **Complexity:** M

---

### 3.4 Staff Media Folders (Manager Page)

**Status:** Manager page section not implemented.

#### 3.4.1 UI — Media folders section
- **File:** `app/manager/page.tsx`
- **Changes:** Add section listing staff members with expandable media folders. Each folder shows files uploaded by that staff member from `employee-uploads/{userId}/`.
- **Complexity:** M

#### 3.4.2 Server Action — list staff media
- **File:** `lib/actions/media.ts` (NEW)
- **Functions:** `listStaffMedia(userId: string)` — lists objects in `employee-uploads/{userId}/` bucket prefix. `getStaffMediaOverview()` — returns all staff with file counts.
- **Complexity:** M

---

### 3.5 Direct Comms (Manager Page)

**Status:** Manager page section not implemented.

#### 3.5.1 UI — Direct comms section
- **File:** `app/manager/page.tsx`
- **Changes:** Add "Direct Communications" panel allowing manager to broadcast messages to all staff or specific roles. Uses the `messages` table from Phase 1 (bulk send).
- **Complexity:** M

#### 3.5.2 Server Action — broadcast message
- **File:** `lib/actions/messages.ts`
- **Changes:** Add `broadcastMessage(content: string, targetRole?: string)` — sends message to all users or filtered by role.
- **Complexity:** S

---

### 3.6 Map Context

**Status:** Not implemented.

#### 3.6.1 UI — Map component
- **File:** `components/map/SiteMap.tsx` (NEW)
- **Details:** Interactive map of shrine grounds showing geofence boundary, staff locations (if available), incident locations, maintenance ticket locations.
- **Complexity:** L

#### 3.6.2 Database — location fields
- **File:** `supabase/schema.sql`
- **Changes:** Add optional `location_lat`, `location_lon` to `incidents` and `maintenance_tickets` tables.
- **Complexity:** S

---

### 3.7 Alerts API Implementation

**Status:** `app/api/alerts/route.ts` is a stub.

#### 3.7.1 Implement alerts API
- **File:** `app/api/alerts/route.ts`
- **Changes:** GET returns staffing gaps, overtime alerts, unresolved high-severity incidents, and urgent maintenance tickets. POST creates a new alert record (if `alerts` table exists — see 3.1.1, reuse `notifications` table).
- **Complexity:** M

---

### 3.8 Login — Staff ID / Manager SSO Buttons

**Status:** Non-functional placeholder buttons.

#### 3.8.1 Implement Staff ID login
- **File:** `app/login/page.tsx`
- **Changes:** Wire "Staff ID" button to a form that accepts employee ID + PIN, looks up corresponding email in `profiles`, and authenticates. Or remove if email/password is the only auth method.
- **Complexity:** M

#### 3.8.2 Implement Manager SSO
- **File:** `app/login/page.tsx`
- **Changes:** Wire "Manager SSO" to Supabase OAuth (Google Workspace) if the org uses Google SSO. Configure OAuth in Supabase dashboard.
- **Complexity:** L

---

## Task Checklist

### Phase 1: Critical

- [ ] **1.1.1** Database: Add `messages` table + RLS policies (`supabase/schema.sql`)
- [ ] **1.1.2** Server Action: Create `lib/actions/messages.ts` (sendMessage, getConversations, getMessagesWithUser, markMessagesAsRead)
- [ ] **1.1.3** UI: Create `app/messages/page.tsx`
- [ ] **1.1.4** UI: Create `components/messaging/ConversationList.tsx`, `ChatWindow.tsx`, `MessageBubble.tsx`
- [ ] **1.1.5** UI: Add Messages tab to `components/layout/BottomNav.tsx`
- [ ] **1.1.6** Middleware: Add `/messages` to auth guard in `app/middleware.ts`
- [ ] **1.2.1** Database: Add `staff_assignments` table + RLS policies (`supabase/schema.sql`)
- [ ] **1.2.2** Server Action: Create `lib/actions/staffing.ts` (validateStaffingForEvent, getStaffingGaps, assignStaffToEvent)
- [ ] **1.2.3** UI: Add gap alerts to `app/calendar/page.tsx`
- [ ] **1.2.4** UI: Create `components/calendar/StaffingGapBadge.tsx`
- [ ] **1.2.5** UI: Add staffing panel to `app/manager/page.tsx`
- [ ] **1.3.1** Database: Modify `handle_new_user()` trigger to read role from `raw_user_meta_data` (`supabase/schema.sql`)
- [ ] **1.3.2** Server Action: Create `lib/actions/auth.ts` (signUpWithEmail with role)
- [ ] **1.3.3** UI: Add role selector to `app/login/page.tsx` signup form
- [ ] **1.3.4** UI: Add manager invite code gate to `app/login/page.tsx`
- [ ] **1.4.1** Config: Add `SITE_LAT`, `SITE_LON`, `GEOFENCE_RADIUS` to `.env.local`
- [ ] **1.4.2** Server Action: Add geofence validation to `lib/actions/clock-in.ts`
- [ ] **1.4.3** API Route: Add geofence validation to `app/api/clock/route.ts`
- [ ] **1.4.4** Refactor: Update `lib/geofence.ts` to read coords from env
- [ ] **1.5.1** Fix: Update `lib/actions/overtime-analysis.ts` to use 7.5h threshold from `lib/labor-math.ts`
- [ ] **1.5.2** Verify: Confirm `app/manager/page.tsx` uses corrected threshold

### Phase 2: Important

- [ ] **2.1.1** Server Action: Add `validateOperatingHours()` to `lib/actions/clock-in.ts`
- [ ] **2.1.2** API Route: Add operating hours check to `app/api/clock/route.ts`
- [ ] **2.1.3** UI: Display operating hours in `app/dashboard/page.tsx`
- [ ] **2.2.1** Server Action: Add after-hours check to `lib/actions/staffing.ts`
- [ ] **2.2.2** UI: Add after-hours variant to `components/calendar/StaffingGapBadge.tsx`
- [ ] **2.3.1** Server Action: Add 7.5h shift limit check to `lib/actions/clock-in.ts`
- [ ] **2.3.2** UI: Add shift limit warning to `components/dashboard/ShiftTimer.tsx`
- [ ] **2.4.1** Database: Add `visitor_counts` table + RLS (`supabase/schema.sql`)
- [ ] **2.4.2** Server Action: Create `lib/actions/visitors.ts` (recordVisitorCount, getVisitorVolumeForDate, getVisitorVolumeRange)
- [ ] **2.4.3** UI: Add visitor count input to `app/dashboard/page.tsx`
- [ ] **2.4.4** UI: Replace hardcoded chart with real data in `app/manager/page.tsx`
- [ ] **2.5.1** Server: Update shifts query in `app/manager/page.tsx` to join profiles
- [ ] **2.5.2** UI: Update `components/manager/StaffTable.tsx` to show names and roles
- [ ] **2.6.1** UI: Update `components/profile/ProfileCard.tsx` to show role from profiles
- [ ] **2.6.2** Server: Verify `app/profile/page.tsx` passes profile to ProfileCard
- [ ] **2.7.1** UI: Wire up file upload in `components/forms/MaintenanceTicketForm.tsx`
- [ ] **2.7.2** API: Fix signed URL generation in `app/api/upload/route.ts`
- [ ] **2.8.1** Cleanup: Delete `app/layout_new.tsx`

### Phase 3: Future

- [ ] **3.1.1** Database: Add `notifications` table + RLS (`supabase/schema.sql`)
- [ ] **3.1.2** Server Action: Create `lib/actions/notifications.ts` (CRUD + shift reminders)
- [ ] **3.1.3** Server Action: Add `checkAndSendShiftReminders()` scheduler
- [ ] **3.1.4** UI: Create `components/layout/NotificationBell.tsx`, update BottomNav
- [ ] **3.1.5** Infra: Set up service worker `app/sw.ts` and web push
- [ ] **3.2.1** Script: Implement `scripts/sync_calendars.py` (GOA iCal parsing + upsert)
- [ ] **3.2.2** Script: Add Google Calendar sync to `scripts/sync_calendars.py`
- [ ] **3.2.3** Infra: Set up cron job for calendar sync
- [ ] **3.3.1** Server Action: Create `lib/actions/schedule-optimizer.ts`
- [ ] **3.3.2** UI: Add optimization panel to `app/manager/page.tsx`
- [ ] **3.4.1** UI: Add media folders section to `app/manager/page.tsx`
- [ ] **3.4.2** Server Action: Create `lib/actions/media.ts`
- [ ] **3.5.1** UI: Add direct comms panel to `app/manager/page.tsx`
- [ ] **3.5.2** Server Action: Add `broadcastMessage()` to `lib/actions/messages.ts`
- [ ] **3.6.1** UI: Create `components/map/SiteMap.tsx`
- [ ] **3.6.2** Database: Add location fields to incidents and maintenance_tickets
- [ ] **3.7.1** API: Implement `app/api/alerts/route.ts`
- [ ] **3.8.1** UI: Implement Staff ID login in `app/login/page.tsx`
- [ ] **3.8.2** Infra: Configure Manager SSO (Google OAuth) in Supabase

---

## Dependency Graph

```
Phase 1 (must be done first)
├── 1.1 P2P Messaging
│   ├── 1.1.1 DB (messages table) ──→ 1.1.2 Server Actions ──→ 1.1.3-1.1.4 UI
│   └── 1.1.5-1.1.6 Nav/Middleware
├── 1.2 Staffing Enforcement
│   ├── 1.2.1 DB (staff_assignments) ──→ 1.2.2 Server Actions ──→ 1.2.3-1.2.5 UI
├── 1.3 Signup Role Selection
│   ├── 1.3.1 DB (trigger mod) ──→ 1.3.2 Server Action ──→ 1.3.3-1.3.4 UI
├── 1.4 Geofence Server-Side
│   ├── 1.4.1 Config ──→ 1.4.2-1.4.4 Server/API/Refactor
└── 1.5 Overtime Threshold Fix
    └── 1.5.1-1.5.2 (independent, quick fix)

Phase 2 (depends on Phase 1)
├── 2.1-2.3 Operating Hours / After-Hours / Shift Limit (extend clock-in.ts from 1.4)
├── 2.4 Visitor Volume (new table, independent)
├── 2.5-2.6 StaffTable + ProfileCard fixes (independent)
├── 2.7 File Upload Fix (independent)
└── 2.8 Dead Code Removal (independent)

Phase 3 (depends on Phase 1-2)
├── 3.1 Push Notifications (new table, independent but complex)
├── 3.2 GOA Calendar Sync (independent script)
├── 3.3 Overtime Auto-Reduction (builds on 1.5 fix)
├── 3.4-3.5 Manager Page Additions (builds on 1.1 messaging)
├── 3.6 Map Context (independent)
├── 3.7 Alerts API (builds on 3.1 notifications)
└── 3.8 Login SSO (independent)
```

---

## Recommended Implementation Order

1. **1.5** Overtime threshold fix (5 min, unblocks everything)
2. **2.8** Delete dead code (1 min, cleanup)
3. **1.4** Geofence server-side (env vars + validation)
4. **1.3** Signup role selection (DB trigger + UI)
5. **1.2** Staffing enforcement (DB + actions + UI)
6. **1.1** P2P Messaging (DB + actions + full UI)
7. **2.1-2.3** Operating hours / after-hours / shift limit (extend existing clock-in)
8. **2.4** Visitor volume data model
9. **2.5-2.7** StaffTable, ProfileCard, File Upload fixes
10. **3.x** Phase 3 items in any order based on priority

---

## Notes

- All database changes should be applied as a single migration script. Append new tables/changes to `supabase/schema.sql` and run against Supabase.
- RLS policies must be tested after each table addition.
- The `profiles` table already exists and supports the needed role-based access.
- Supabase Storage bucket `employee-uploads` exists but is private — signed URLs needed for file access.
- Real-time features (P2P messaging) should use Supabase Realtime channels.
- Push notifications require a service worker and VAPID keys — consider using a service like OneSignal for simplicity.
