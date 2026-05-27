# Shrine Ops

> Operational command center for **St. Nicholas National Shrine at Ground Zero**, New York City.

Shrine Ops is a full-stack, role-based staff management platform purpose-built for a real-world religious landmark. It replaces paper sign-in sheets, radio communications, and spreadsheet scheduling with a unified web application accessible on any device. Every feature maps directly to a real operational need — geofenced clock-in so managers know staff are physically on-site, AI-drafted daily briefings to save manager prep time, live audio alerts for incidents, and a gamified recognition system to improve staff morale and retention.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 — App Router, TypeScript, Server Components |
| Auth & Database | Supabase — Postgres, Row Level Security, Realtime |
| Styling | Tailwind CSS with Material Design 3 color tokens |
| Animation | Framer Motion |
| PDF Generation | Puppeteer Core + @sparticuz/chromium (Vercel-compatible) |
| Testing | Vitest + Testing Library |
| Deployment | Vercel, connected to Supabase via native integration |

---

## Roles & Access

Every user account has a `role` field in the `profiles` table. The UI and server actions enforce role-based access at every layer — middleware, server components, and server actions all check the role before returning data or allowing mutations.

| Role | What they can do |
|---|---|
| **Manager** | Everything: staff table, payroll, reports, shift optimizer, ticket command, AI config, alert center, media folders, broadcast messages, schedule management |
| **Operations** | Dashboard, clock-in/out, walkthroughs, maintenance tickets, direct messaging, operations brief, recognition leaderboard |
| **Security** | Dashboard, clock-in/out, security walkthroughs, incident reports, visitor tally, direct messaging |
| **Council** | Read-only oversight view: live visitor count, digital chant stand, event map, can submit maintenance tickets |

### Manager Invite Code
To prevent unauthorized manager accounts, self-registration as a manager requires a secret invite code. The default is `SHRINE2026`, configurable via `NEXT_PUBLIC_MANAGER_INVITE_CODE`. Staff registering without the code are assigned the `operations` role by default.

---

## Feature Reference

### Dashboard (`/dashboard`)

The main landing page for all non-council staff after login. It is server-rendered and personalized per role.

**What it contains:**
- **Top App Bar** — Navigation with unread message badge and role-aware links
- **Clock-In Card** — The primary clock-in/out control (see below)
- **Shift Timer** — Live elapsed time display once clocked in
- **Break Countdown** — Shows upcoming break windows based on time worked
- **Daily Brief Preview** — Today's published daily brief, if one exists
- **Messaging Preview** — Latest unread messages with link to full inbox
- **Quick Submit** — Shortcut to submit a maintenance ticket or incident without leaving the dashboard
- **Map Context** — Embedded map showing the shrine location and current event context
- **Role Action Center** — Role-specific action shortcuts (operations sees walkthrough links, security sees incident report links)
- **Operations Action Cards** — Additional quick-access cards for operations staff
- **Live Visitor Count** — Real-time visitor tally (security and operations)

Council members are automatically redirected to `/council` when they hit `/dashboard`.

---

### Clock-In & Shift Timer

**How it works:**
1. Staff tap **Clock In** on the dashboard
2. The browser requests the device's GPS coordinates
3. The coordinates are compared against the Liberty Park geofence center (configurable via env vars, defaulting to 40.7101341, -74.0132028) within a 65-meter radius
4. If inside the fence: the clock-in is recorded to the `shifts` table with `clock_in = now()` and a success chime plays
5. If outside the fence: clock-in is rejected, a geofence warning audio alert fires, and a `geofence_violation` alert is automatically logged to the manager alert queue
6. If after 9 AM at clock-in time: a `late_clock_in` alert is also logged for the manager

**Break schedule** (auto-calculated from elapsed time):
- 2 hours worked → 15-minute paid break reminder
- 4.5 hours worked → 30-minute unpaid lunch reminder
- 6.5 hours worked → second 15-minute paid break reminder

**Overtime detection:** The system flags shifts exceeding 7.5 hours and surfaces them in the Shift Optimizer.

**Clock-Out** records `clock_out = now()` and closes the active shift. If the shift exceeded the labor thresholds, it is flagged for overtime review.

All thresholds are defined in `constants/index.ts` (`LABOR`, `BREAKS`, `GEOFENCE`) so they can be adjusted without touching business logic code.

---

### Wake-Up Alarm (`/settings`)

Staff who commute and need a pre-shift reminder can configure a personal wake-up alarm.

**How it works:**
- The staff member sets a wake-up time in Settings
- The setting is saved to the `staff_wake_up_alarms` table
- `WakeUpAlarmMonitor.tsx` (mounted in the app shell) polls every minute
- When the current time matches the alarm time AND the staff member has not yet clocked in for the day, a popup notification appears and an audio alarm plays (`/audio/staff-reminders/wake-up-reminder.mp3`)
- The alarm can be enabled/disabled and deleted from Settings

---

### Event Calendar (`/calendar`)

A full monthly/daily event calendar fed from Google Calendar.

**Sync:** On `npm run dev`, `scripts/sync-google-calendar.js` fetches events from the configured Google Calendar ID and upserts them into the `events` table. A manual re-sync can be triggered via `/api/sync-calendar`. Events include title, start time, end time, location, and description.

**Calendar view:** Events are displayed in a timeline per day. Each event card shows:
- Event title and time
- Assigned staff by role (operations, security, greeter, director), with profile avatars
- A quick-assign dropdown to add staff directly from the calendar

**Single-day detail (`/calendar/[date]`):** Clicking a date opens a detailed view of all events that day with full staff assignment controls and after-hours validation status.

---

### Staff Assignment & Staffing Gaps

**Assignment:** Managers (and operations staff with permission) can assign any staff member to any event from the calendar or from the Manager dashboard. The staff dropdown is filtered to `["operations", "security"]` roles. Each assignment stores the user ID, event ID, and the role they are filling (e.g., "operations", "security", "greeter").

**Staffing Gap Detection:** The Manager dashboard includes a `StaffingGaps` panel that queries for events that have no assigned staff. These are surfaced as "uncovered events" with a one-click assign button so the manager can fill gaps without navigating to the calendar.

**After-Hours Validation:** Events that fall outside 9AM–5PM are flagged as after-hours. The system checks that at least one operations staff and one security staff are assigned; if not, a gap warning is shown.

---

### Manager Command Center (`/manager`)

The manager's central hub, containing all operational widgets in a single scrollable page:

| Panel | What it does |
|---|---|
| **Staff Table** | Full list of all staff with role, email, last sign-in |
| **Schedule Overview** | Summary of upcoming events with assignment counts |
| **Staffing Gaps** | Events with no assigned staff, with one-click assign |
| **Shift Optimizer** | AI-powered overtime analysis (see below) |
| **Ticket Command** | All open maintenance tickets with assign/resolve controls |
| **Manager Alerts** | Real-time alert feed: geofence violations, late check-ins, missed walkthroughs, safety incidents, overdue tasks |
| **AI Config Panel** | Configure which AI provider (OpenAI / Gemini / OpenRouter) is used for briefs and optimization |
| **Visitor Volume Chart** | Charted visitor count data over time |
| **Media Folders** | Browse uploaded photos and files by category |
| **Direct Comms** | Quick-launch messaging to any staff member or department |

---

### Shift Optimizer

The shift optimizer analyzes current shift data to identify overtime situations and estimate potential labor cost savings.

**How it works:**
1. The manager clicks **Optimize Shifts** in the Shift Optimizer panel
2. The panel reads the configured AI provider and API key from `localStorage` (set in AI Config panel)
3. A POST request is sent to `/api/manager/optimizer` with the provider and key
4. The server action queries all recent shifts, calculates hours per staff member, and identifies those exceeding the 7.5-hour threshold
5. The AI provider (or a rule-based fallback if provider is "none") generates suggestions: which events have excess hours and by how much
6. The panel displays estimated dollar savings and a list of actionable suggestions
7. The manager can click **Manual Overhaul** to go to the calendar and reassign shifts

---

### Manager Alerts

A real-time alert feed for the manager. Alerts are written to the `manager_alerts` table by various parts of the system:

| Alert Type | Triggered by |
|---|---|
| `geofence_violation` | Staff attempting to clock in outside the geofence |
| `late_clock_in` | Staff clocking in after 9 AM |
| `missed_walkthrough` | Scheduled walkthrough not submitted on time |
| `safety_incident` | Any incident report submitted |
| `task_overdue` | Maintenance ticket not resolved past its expected window |

The `ManagerAlertsCard` component polls every 10 seconds. When new unacknowledged alerts arrive, it plays the matching audio alert sound. Alerts have severity levels: `info`, `warning`, `critical`. Managers can acknowledge individual alerts to clear them from the active feed, or toggle a "Show Acknowledged" view.

---

### AI Config Panel

The manager can select which AI provider powers the shift optimizer, operations brief drafting, and daily brief generation:

| Option | Provider |
|---|---|
| OpenAI | GPT-4o / GPT-4 via OpenAI API |
| Google Gemini | Gemini Pro via Google AI Studio |
| OpenRouter | Any model via OpenRouter API |
| None | Rule-based fallback, no AI calls |

The API key is stored in `localStorage` (client-side only, never sent to Supabase). The provider selection is also persisted in `localStorage` under `shrine_ai_provider` and `shrine_ai_key`.

---

### Daily Brief (`/daily-brief`)

A structured daily briefing written by the manager each day and visible to all staff on their dashboard.

**Sections:**
- At a Glance — summary of the day
- Scheduling & Shifts — staffing notes
- Site Readiness — physical facility status
- Incidents & Safety — any overnight or ongoing incidents
- Maintenance Tickets — open or recently resolved tickets
- Team Building — recognition or notes
- Upcoming Events — preview of the week ahead
- Manager Notes — freeform notes

**Workflow:** `draft → review → published → archived`
- Managers draft and edit each section
- The brief is sent for review (viewable only to managers)
- Once published, it appears on all staff dashboards under "Today's Brief"
- Archived briefs are accessible at `/daily-brief/archive`
- Individual briefs are readable at `/brief/[slug]`

An AI-generated first draft can be requested to pre-fill sections based on current event, ticket, and incident data.

---

### Operations Brief (`/operations-brief`)

Similar to the Daily Brief but formatted as an operations bulletin for the operations team specifically. Follows the same `draft → review → published → archived` lifecycle.

**Additional capabilities:**
- AI-generated first draft (calls `/api/generate-operations-brief` which uses the configured AI provider)
- PDF export — the published brief can be downloaded as a formatted PDF via `/api/generate-pdf`
- Archive view at `/operations-brief/archive`

---

### SOPs (`/sops`)

A Standard Operating Procedures document library.

**Manager capabilities:** Upload SOP documents (PDF, Word, or other files), assign them to categories (e.g., "Security", "Emergency", "Operations", "Visitor Services"). Uploaded files are stored via the `/api/upload` endpoint.

**Staff capabilities:** Browse and search SOPs by category. View documents inline or download them. Documents are displayed by the `SOPViewer` component with category tabs.

---

### Maintenance Tickets (`/tickets`)

A full ticket management system for reporting and resolving physical maintenance issues at the shrine.

**Creating a ticket:**
- Any staff member can submit a ticket from `/tickets` or via the Quick Submit button on the dashboard
- Fields: title, description, priority (low / medium / high / urgent)
- Optional: attach photos or files (uploaded via `/api/upload`)
- Tickets are linked to the current event if one is active

**Ticket views (tabbed):**
- **Pool** — unassigned tickets available for any operations staff to claim
- **Assigned to Me** — tickets the logged-in staff member has claimed or been assigned
- **My Tickets** — tickets the logged-in user submitted

**Actions by role:**
- Operations staff can **claim** a ticket from the pool, **mark it complete**, or **unclaim** it
- Managers can **assign** a ticket to any specific staff member, **reassign**, or **force-complete**

**Manager view:** The `ManagerTicketCommand` component on the Manager dashboard shows all tickets across all states with full assignment controls in one place, without needing to navigate to `/tickets`.

---

### Incident Reports

Security and operations staff can submit incident reports for anything that happens on-site.

**Report fields:**
- Incident type: Security / Medical / Visitor / Facility
- Severity: Low / Medium / High / Critical
- Description
- Location on-site
- Time of incident

Submitted incidents appear in the Manager's alert feed as a `safety_incident` alert. The incident table stores all submissions for historical review and monthly reporting.

---

### Walkthroughs

Scheduled facility and security checklists that staff complete during their shift.

**Types:**
- Facility walkthrough — general inspection of public areas, restrooms, entrances
- Security walkthrough — perimeter check, access point verification

Staff submit their completed checklist with notes. Submissions are stored in the `walkthroughs` table with timestamp and user. If a scheduled walkthrough is not submitted on time, the system can log a `missed_walkthrough` alert to the manager.

---

### Payroll (`/manager/payroll`)

A pay-period summary tool for the manager.

**How it works:**
- The manager selects a pay period (defaults to current bi-weekly period)
- The system queries all shifts within that period per staff member
- Hours are calculated using actual clock-in / clock-out times, with the 30-minute unpaid lunch deducted for shifts over 4.5 hours
- Each staff member's hours are multiplied by their configured pay rate (stored in `payroll_rates` table)
- The summary shows: regular hours, overtime hours, gross pay

**Export:** The payroll summary can be exported as a formatted PDF via `/api/generate-payroll-pdf` (uses Puppeteer/Chromium).

Pay stub archives are readable per-period at `/payroll/[slug]`, and all periods are listed at `/payroll/archive`.

---

### Reports (`/manager/reports`)

A monthly analytics dashboard for the manager.

**Data shown:**
- Total shifts worked this month vs. last month
- Total hours logged
- Overtime hours flagged
- Maintenance tickets opened, resolved, and outstanding
- Incident reports by type and severity
- Visitor volume trend chart
- Top staff by hours worked

**Export:** All report data can be exported as CSV via the `ExportDataButton` component.

---

### Messaging (`/messages`)

A real-time messaging system for staff communication.

**Direct Messages (DMs):**
- Any staff member can open a conversation with any other staff member
- The conversation list shows all active DMs with unread counts
- Clicking a conversation opens `ChatWindow` with full message history
- Messages are sent as server actions and written to the `messages` table

**Group Chats:**
- Managers can create named group chats and add multiple staff members
- Group chat windows (`GroupChatWindow`) work identically to DMs

**Broadcast Messages:**
- Managers can send a message to all staff at once via the Direct Comms panel on the Manager dashboard

**Unread counts:** The `MessagingPreview` on the dashboard shows unread message counts. The Top App Bar badge also reflects unread messages via the `messages-unread` server action.

**Deep linking:** The `/messages?dept=operations` or `?dept=security` query param pre-filters the conversation list to that department.

---

### Audio Alert System (`/settings`, `/audio-test`)

A rich categorized audio notification system that plays in the browser when events occur.

**Alert categories and examples:**

| Category | Example sounds |
|---|---|
| App Alerts | Successful clock-in, geofence warning |
| Manager Alerts | Late clock-in alert, geofence violation, safety alert, missed walkthrough, task overdue |
| Leaderboard & EOTM | Leaderboard update, Employee of the Month announcement |
| Badge & Recognition | Badge awarded, recognition milestone |
| Safety Alerts | Emergency alert, medical alert |
| Staff Reminders | Wake-up alarm, shift start reminder |
| Task Alerts | New ticket assigned, ticket resolved |
| Walkthrough Alerts | Walkthrough due, walkthrough overdue |

All audio keys are registered in `lib/audio/alert-sounds.ts`. The `useAlertAudio` hook is used by components to play sounds by key. Audio files live in `public/audio/` organized by category.

**Per-user preferences:** Staff can toggle each alert category on or off in `/settings`. Preferences are stored locally and applied to the monitors on load.

**Audio Test page (`/audio-test`):** A developer tool that lists all registered sounds by category with a play button for each — useful for verifying new audio files or testing speaker setup.

---

### Recognition & Gamification (`/recognition`)

A points and badges system to motivate and reward staff.

**Leaderboard:**
- All staff are ranked by their total recognition points
- Points are awarded for actions: completing walkthroughs, resolving tickets, clocking in on time, etc. (configured in `point_rules` table)
- The leaderboard updates in near-real-time as events are logged to `recognition_points`

**Badges:**
- Managers can create badge definitions with a name, description, image (`public/badges/`), and point value
- From the recognition page, a manager can open the Award Panel, select a badge, pick a staff member from a dropdown, and submit the award
- The award is written to `badge_awards` and the staff member's point total is updated
- A push notification is created for the recipient and the `RecognitionMonitor` fires a badge audio alert

**Employee of the Month (EOTM):**
- The recognition page surfaces EOTM candidates — staff with the highest points for the current month
- The manager can formally designate the EOTM, which triggers a dedicated audio announcement for all staff currently using the app

**Staff view:** All staff can see the full leaderboard, their own badge collection, and their point history on the recognition page. They cannot award badges — only managers can.

---

### Council Dashboard (`/council`)

A read-only oversight view for council members. Council members are redirected here automatically on login.

**Panels:**
- **MapContext** — Embedded map showing the shrine location and current active event
- **Running Visitor Count** — Live Supabase Realtime-backed tally of visitors currently on-site (updates in real time as security staff increment/decrement the count)
- **Digital Chant Stand** — An embedded panel linking to the digital liturgical chant resource used during services
- **Current Event Info** — Title, time, and summary of the current or next upcoming event
- **Maintenance Ticket Form** — Council members can submit a maintenance ticket if they notice a physical issue, even though they cannot manage tickets

Council members cannot access `/dashboard`, `/manager`, `/tickets` (management view), or any staff-specific pages.

---

### Settings (`/settings`)

Per-user preferences and personal configuration.

**Sections:**
- **Theme** — Toggle between light and dark mode (persisted in `localStorage`)
- **Notification Preferences** — Toggle audio alerts on/off by category. Each category shows its alert names with descriptions, a toggle switch, and an audio preview button
- **Wake-Up Alarm** — Set a daily pre-shift alarm time (hour/minute). Saved to `staff_wake_up_alarms` table. Can be enabled/disabled or deleted

---

### Profile (`/profile`)

Each staff member's personal profile page.

**Contents:**
- Profile card: name, role, email, avatar
- Shift history: list of all past shifts with clock-in/out times and total hours
- Scheduled assignments: upcoming events the staff member is assigned to
- Recognition summary: total points and badges earned

---

### Auth Flows

| Page | Purpose |
|---|---|
| `/login` | Email + password login via Supabase Auth |
| `/signup` | Self-registration with role selection (manager requires invite code) |
| `/forgot-password` | Sends a password reset email via Supabase + SMTP |
| `/reset-password` | Accepts the reset token and sets a new password |

Session management is handled by middleware using `@supabase/ssr`'s `createServerClient`. All session cookies are refreshed on every request. The middleware also enforces the operating hours window (6AM–11PM) — requests outside this window are redirected.

---

### Operating Hours Gate (Middleware)

`middleware.ts` applies a time-based access control. The shrine operates 9AM–5PM, but staff may access the app slightly before and after for prep. The gate allows access from **6:00 AM to 11:00 PM UTC**. Requests outside this window receive a redirect to a maintenance/closed page.

The operating hours check is exported as a testable pure function `isWithinOperatingHours(date?)`, making it easy to unit test without mocking the real clock.

---

### Developer Tools

**Dev Bypass Cookies:**
Without real Supabase credentials (for local UI development), set these cookies in the browser:
```
shrine_dev_session = true
shrine_dev_role = manager | operations | security | council
shrine_dev_name = "My Test Name"   (optional)
```
These cookies make every server component and server action behave as if the specified role is authenticated, without any Supabase auth check.

**Audit Tables API (`/api/audit-tables`):**
A GET endpoint that checks whether all expected Supabase tables exist in the database. Returns a JSON list of which tables are present and which are missing. Useful after a fresh Supabase project setup to confirm all migrations have been applied.

**Audio Test Page (`/audio-test`):**
Lists every registered alert sound organized by category. Each sound has a play button so you can verify that audio files are correctly placed and readable by the browser.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=           # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=          # Service role key — server only, never expose to client

# Geofence — Liberty Park, NYC defaults shown
NEXT_PUBLIC_SITE_LAT=40.7101341
NEXT_PUBLIC_SITE_LON=-74.0132028
NEXT_PUBLIC_GEOFENCE_RADIUS=65      # Radius in meters. 65m covers the shrine entrance area.

# Google integrations (required for calendar sync and maps)
GOOGLE_MAPS_API_KEY=                # Used for the MapContext embed
GOOGLE_CALENDAR_API_KEY=            # Read-only calendar API key
GOOGLE_CALENDAR_ID=                 # Calendar ID, e.g. user@gmail.com or abc@group.calendar.google.com

# AI providers (optional — any one or all can be configured)
GEMINI_API_KEY=                     # Google Gemini Pro for brief drafting and optimization
# OpenAI and OpenRouter keys are entered by the manager at runtime in the AI Config panel
# and stored in localStorage — they are never stored in env vars

# Manager registration gate (optional — has a default)
NEXT_PUBLIC_MANAGER_INVITE_CODE=SHRINE2026
```

---

## Getting Started

```bash
npm install
cp .env.example .env.local    # Fill in Supabase and Google credentials
npm run dev                   # Syncs Google Calendar, then starts Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000).

- Register a manager account using the invite code
- Or set dev bypass cookies to test any role without credentials

### Production build

```bash
npm run build
npm start
```

### Tests

```bash
npm test
```

---

## Project Structure

```
app/                              # Next.js App Router pages & API routes
  api/
    alerts/                       # Real-time alert polling endpoint
    audit-tables/                 # DB table existence checker
    clock/                        # Clock-in/out REST endpoint
    generate-operations-brief/    # AI brief generation (POST)
    generate-payroll-pdf/         # Payroll PDF export (Puppeteer)
    generate-pdf/                 # Generic HTML-to-PDF (Puppeteer)
    manager/optimizer/            # AI shift optimizer (POST)
    sync-calendar/                # Manual Google Calendar sync trigger
    upload/                       # Multi-file upload to Supabase Storage
  audio-test/                     # Developer audio preview page
  brief/[slug]/                   # Daily brief public reader
  calendar/[date]/                # Single-day event detail with assignment
  council/                        # Council read-only dashboard
  daily-brief/archive/            # Archived daily briefs list
  daily-brief/[slug]/             # Individual brief reader
  dashboard/                      # Main staff dashboard
  manager/payroll/                # Pay period summary + PDF export
  manager/reports/                # Monthly analytics + CSV export
  messages/                       # Direct messaging + group chats
  operations-brief/archive/       # Archived operations briefs
  payroll/[slug]/                 # Pay stub reader
  payroll/archive/                # Pay stub archive
  profile/                        # Staff profile + shift history
  recognition/                    # Leaderboard, badges, EOTM
  settings/                       # Notification prefs + wake-up alarm
  signup/                         # Self-registration with role selection
  sops/                           # SOP document library
  tickets/                        # Maintenance ticket board

components/
  calendar/                       # EventTimeline, CalendarControls, StaffAssignmentModal
  council/                        # RunningVisitorCountCard, DigitalChantStandPanel
  dashboard/                      # ClockInCard, ShiftTimer, BreakCountdown, DailyBrief,
                                  # MessagingPreview, QuickSubmit, MapContext,
                                  # RoleActionCenter, OperationsActionCards, LiveVisitorCountCard
  forms/                          # MaintenanceTicketForm, IncidentReportForm, WalkthroughForm
  layout/                         # TopAppBar, DashboardMotion
  manager/                        # StaffingGaps, ShiftOptimizerPanel, AIConfigPanel,
                                  # StaffTable, ScheduleOverview, VisitorVolumeChart,
                                  # MediaFolders, DirectComms, ManagerAlertsCard, ExportDataButton
  messaging/                      # ChatWindow, ConversationList, GroupChatList,
                                  # GroupChatWindow, CreateGroupModal
  operations-brief/               # OperationsBriefPreview
  payroll/                        # PayrollClient
  profile/                        # ProfileCard, ScheduleList, ShiftHistory
  shared/                         # TicketCard, ManagerTicketCommand, OperationsTicketDashboard
  sops/                           # SOPUploader, SOPViewer
  theme/                          # ThemeToggle
  ui/                             # Button, Switch — base primitives
  RecognitionMonitor.tsx          # Background poller — fires badge/EOTM audio when events arrive
  ShiftLifecycleMonitor.tsx       # Background poller — fires break/overtime audio during shifts
  WakeUpAlarmMonitor.tsx          # Background poller — fires pre-shift wake-up alarm

lib/
  actions/                        # All server actions (Next.js "use server")
    after-hours.ts                # After-hours staffing validation
    auth.ts / auth-helpers.ts     # requireAuth(), requireManager() guards
    breaks.ts                     # Break start/end tracking
    clock-in.ts                   # Clock in/out with geofence check
    daily-brief.ts                # Daily brief CRUD + AI draft generation
    event-context.ts              # getCurrentOrNextEvent(), getOperationsSummary()
    incidents.ts                  # Incident report CRUD
    manager-alerts.ts             # Log and fetch manager alerts
    messages.ts                   # Send message, get conversations, get messages
    messages-unread.ts            # Unread count for badge display
    notifications.ts              # Create and fetch per-user notifications
    operations-brief.ts           # Operations brief CRUD with status machine
    overtime-reduction.ts         # Identify overtime shifts and estimate savings
    payroll.ts                    # Pay period calculation and pay rate queries
    recognition.ts                # Leaderboard, badge CRUD, award badge, EOTM
    schedule-optimizer.ts         # AI-powered schedule optimization
    schedules.ts                  # Staff schedule queries
    setup-staff.ts                # Initial staff account provisioning helper
    shift-report.ts               # Shift summary for export
    sops.ts                       # SOP document upload, list, delete
    staffing.ts                   # Assign staff to events, detect gaps
    tickets.ts                    # Maintenance ticket CRUD + staff assignment
    visitor-volume.ts             # Increment/decrement visitor count
    wake-up-alarm.ts              # Wake-up alarm get/set/delete/mark-triggered
    walkthroughs.ts               # Walkthrough submission and history
  audio/
    alert-sounds.ts               # All audio key definitions and file path registry
  operations-brief-api.ts         # Client-side AI brief generation helper

constants/index.ts                # LABOR (shift/OT thresholds), BREAKS, GEOFENCE, SECURITY
hooks/
  useAlertAudio.ts                # Hook to play named audio alerts
middleware.ts                     # Auth session refresh + operating hours gate
scripts/
  sync-google-calendar.js         # Fetches Google Calendar events → upserts to Supabase
supabase/                         # All SQL schema and migration files
  schema-canonical.sql            # Full canonical schema (apply first)
  migrations/                     # Individual migration files
  recognition-gamification-migration.sql
  operations-brief-migration.sql
  wake-up-alarm.sql
  manager-alerts.sql
  (+ others)
types/                            # Shared TypeScript type definitions
utils/supabase/
  client.ts                       # Singleton browser Supabase client
  server.ts                       # Server Supabase client + admin client (service role)
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `profiles` | Staff profiles linked to Supabase Auth users. Contains `full_name`, `email`, `role`, `pay_rate`. |
| `events` | Calendar events synced from Google Calendar. `title`, `start_time`, `end_time`, `location`, `description`. |
| `shifts` | Clock-in/out records. `user_id`, `event_id`, `clock_in`, `clock_out`, `latitude`, `longitude`. |
| `staff_assignments` | Links staff to events with `role_assigned` (operations/security/greeter/director). |
| `breaks` | Individual break records per shift. `shift_id`, `break_start`, `break_end`, `break_type` (paid/unpaid). |
| `maintenance_tickets` | Maintenance requests. `title`, `description`, `priority`, `status`, `assigned_to`, `media_urls`. |
| `incidents` | Incident reports. `type`, `severity`, `description`, `location`, `incident_time`. |
| `walkthroughs` | Walkthrough submissions. `user_id`, `type`, `notes`, `submitted_at`. |
| `visitor_volume` | Visitor count entries. Supabase Realtime is enabled on this table for live updates. |
| `messages` | Direct and broadcast messages. `sender_id`, `recipient_id`, `body`, `is_broadcast`. |
| `message_groups` | Group chat definitions. `name`, `created_by`, `member_ids[]`. |
| `notifications` | Per-user notification queue. `user_id`, `message`, `type`, `read`. |
| `media_files` | Uploaded file metadata. `url`, `linked_to` (ticket/incident ID), `file_type`. |
| `sop_documents` | SOP file records. `title`, `category`, `file_url`, `uploaded_by`. |
| `operations_briefs` | Operations bulletin records with `status` (draft/review/published/archived) and JSON `sections`. |
| `daily_briefs` | Daily briefing records with `status` and per-section content. |
| `recognition_badges` | Badge definitions. `name`, `description`, `image_url`, `point_value`. |
| `badge_awards` | Staff badge award instances. `badge_id`, `user_id`, `awarded_by`, `awarded_at`. |
| `recognition_points` | Running point totals per staff member. `user_id`, `total_points`. |
| `point_events` | Individual point transactions. `user_id`, `points`, `reason`, `created_at`. |
| `point_rules` | Rules for automatic point awards. `action_type`, `points`, `description`. |
| `staff_wake_up_alarms` | Per-user alarm config. `user_id`, `wake_up_time`, `enabled`, `last_triggered`. |
| `payroll_rates` | Pay rate config per staff member. `user_id`, `hourly_rate`. |
| `manager_alerts` | Alert queue for managers. `alert_type`, `severity`, `message`, `acknowledged`. |

Schema files are in `supabase/`. Apply `schema-canonical.sql` first via the Supabase SQL editor, then apply individual migration files in the `migrations/` folder.

> **Important:** FK joins in `.select()` (e.g., `profiles!fkey()`) are not used anywhere in this codebase. All related profile data is fetched with separate batch queries (`in()`) because the FK constraints are not currently enforced at the database level. This is an intentional tradeoff documented in every server action file.

---

## Deployment

### Vercel (recommended)

1. Push the repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. In Vercel, install the **Supabase integration** — it automatically syncs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as environment variables
4. Add the remaining env vars manually in the Vercel dashboard (Google keys, geofence coordinates, Gemini key, invite code)
5. In Supabase → Auth → URL Configuration: set **Site URL** to your Vercel deployment URL and add it to **Redirect URLs** (needed for password reset and magic links)
6. In Supabase → Auth → SMTP: configure an SMTP provider so password reset emails are delivered
7. In Supabase → Database → Replication: enable **Realtime** on the `visitor_volume` table so the Council dashboard updates live

### Windows Development Notes

- Before every `next build` or after build errors, delete `.next/`: `Remove-Item -Recurse -Force .next`
- Never run `next build` while the dev server is running — the dev server holds a lock on `.next/trace` (EPERM)
- Start the dev server in a **separate PowerShell window** so it survives VS Code tool timeouts: `Start-Process powershell.exe -ArgumentList "-NoExit -Command &{Set-Location 'C:\path\to\shrine-app'; npm run dev}" -WindowStyle Normal`
- Kill stale node processes before starting fresh: `Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue`

---

## License

See [LICENSE](LICENSE).
