# Shrine Ops

> Operational command center for **St. Nicholas National Shrine at Ground Zero**.

A role-based staff management platform built for a real-world religious landmark. Covers the full staff operations lifecycle — scheduling, clock-in/out, maintenance, security, payroll, messaging, and gamified recognition — with AI-assisted briefing and shift optimization.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router, TypeScript) |
| Auth & Database | Supabase (Postgres + Row Level Security) |
| Styling | Tailwind CSS + Material Design 3 tokens |
| Animation | Framer Motion |
| PDF Generation | Puppeteer Core + @sparticuz/chromium |
| Testing | Vitest + Testing Library |
| Deployment | Vercel (connected to Supabase integration) |

---

## Roles & Access

| Role | Access |
|---|---|
| **Manager** | Full command center — staff table, schedule overview, staffing gaps, shift optimizer, ticket command, payroll, reports, AI config, alert center, direct comms, media folders |
| **Operations** | Dashboard, clock-in/out, walkthroughs, maintenance tickets, team messaging, operations brief, recognition |
| **Security** | Dashboard, clock-in/out, security walkthroughs, incident reports, visitor tally |
| **Council** | Read-only oversight — live visitor count, digital chant stand, event map, ticket submission |

A manager invite code (`SHRINE2026` by default) gates manager self-registration.

---

## Features

### Core Operations
- **Clock-In / Shift Timer** — GPS geofenced clock-in/out. Detects if staff are within the Liberty Park geofence before allowing clock-in. Live elapsed timer with break countdown (15m paid → 30m unpaid lunch → 15m paid), overtime detection at 7.5 hours.
- **Wake-Up Alarm** — Per-staff configurable pre-shift alarm with audio notification. Monitors clock-in status and alerts if staff have not checked in by start time.
- **After-Hours Validation** — Enforces minimum operations + security coverage for events outside standard 9AM–5PM hours.

### Calendar & Scheduling
- **Event Calendar** — Monthly/daily event timeline synced from Google Calendar. Each event shows assigned staff by role (operations, security, greeter, director).
- **Staff Assignment** — Assign staff to events directly from the calendar with role selection filtered to operations/security.
- **Staffing Gaps** — Auto-detected uncovered events surface in the Manager dashboard with one-click assignment.
- **Schedule Optimizer** — AI-powered shift optimization via configurable provider (OpenAI, Google Gemini, or OpenRouter). Analyzes overtime and surfaces savings estimates.
- **Google Calendar Sync** — Auto-runs on `npm run dev` via `scripts/sync-google-calendar.js`.

### Briefings & SOPs
- **Daily Brief** — Manager-authored daily briefing with structured sections: at-a-glance, scheduling, site readiness, incidents, maintenance, team building, upcoming events, manager notes. Supports draft → review → published → archived workflow.
- **Operations Brief** — Formatted operations bulletin with the same draft/review/publish/archive lifecycle. AI-generated first draft via OpenAI/Gemini/OpenRouter. Exportable as PDF.
- **SOPs** — Standard Operating Procedures document library. Managers upload; all staff can view and search by category.

### Maintenance & Safety
- **Maintenance Tickets** — Create, claim, assign, and resolve tickets with photo/file attachment. Staff and manager views.
- **Incident Reports** — Submit security, medical, or visitor incidents with severity tracking and review workflow.
- **Walkthroughs** — Facility and security checklist submissions with completion history.

### Payroll & Reports
- **Payroll** — Pay-period shift summaries with configurable pay rates per staff member. Manager-facing with PDF export.
- **Reports** — Monthly analytics: shift counts, ticket resolution, incident summaries, visitor volume trends. CSV export.

### Messaging & Notifications
- **Direct Messaging** — One-to-one conversations between staff with unread badge counts.
- **Broadcast Messaging** — Manager-to-all-staff broadcast messages.
- **Alert System** — Categorized real-time audio alerts (app alerts, manager alerts, badge/recognition alerts, safety alerts, walkthrough alerts, task alerts, staff reminders). Configurable per-user in Settings.

### Recognition & Gamification
- **Leaderboard** — Points-based staff leaderboard with rank display.
- **Badges** — Manager-awarded badges tied to point rules with notification on award.
- **Employee of the Month** — Tracked via recognition system with dedicated audio alert.

### Council Features
- **Oversight Dashboard** — Read-only event map, live visitor count, and ticket submission for council members.
- **Digital Chant Stand** — Embedded panel for liturgical resources.
- **Running Visitor Counter** — Live Supabase Realtime-backed visitor tally card.

### Settings & Personalization
- **Theme Toggle** — Light / dark mode with Material Design 3 surface tokens.
- **Notification Preferences** — Per-category audio alert toggles with preview.
- **Wake-Up Alarm Config** — Set, update, or delete pre-shift alarm time.

### Developer & Admin
- **Audit Tables API** — `/api/audit-tables` checks that all required Supabase tables exist.
- **Audio Test Page** — `/audio-test` previews all categorized alert sounds.
- **Dev Bypass** — `shrine_dev_session` + `shrine_dev_role` cookies skip auth in development for any role.
- **Operating Hours Middleware** — Enforces a 6AM–11PM access window and redirects outside of hours.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Service role key (server-only)

# Geofence — Liberty Park, NYC defaults shown
NEXT_PUBLIC_SITE_LAT=40.7101341
NEXT_PUBLIC_SITE_LON=-74.0132028
NEXT_PUBLIC_GEOFENCE_RADIUS=65      # meters

# Google integrations
GOOGLE_MAPS_API_KEY=
GOOGLE_CALENDAR_API_KEY=
GOOGLE_CALENDAR_ID=                 # e.g. abc123@group.calendar.google.com

# Optional — AI briefing & shift optimization
GEMINI_API_KEY=                     # Google Gemini
# OPENAI_API_KEY=                   # Set in AI Config panel at runtime
# OPENROUTER_API_KEY=               # Set in AI Config panel at runtime

# Optional — Manager registration gate
NEXT_PUBLIC_MANAGER_INVITE_CODE=SHRINE2026
```

---

## Getting Started

```bash
npm install
cp .env.example .env.local    # fill in your values
npm run dev                   # syncs Google Calendar then starts dev server
```

Open [http://localhost:3000](http://localhost:3000). Register via Sign Up or log in as an existing user.

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
    alerts/                       # Real-time alert polling
    audit-tables/                 # DB table existence check
    clock/                        # Clock-in/out endpoint
    generate-operations-brief/    # AI brief generation
    generate-payroll-pdf/         # Payroll PDF export
    generate-pdf/                 # Generic PDF export (Puppeteer)
    manager/optimizer/            # AI shift optimizer
    sync-calendar/                # Manual Google Calendar sync trigger
    upload/                       # Media file upload
  audio-test/                     # Alert sound preview (dev tool)
  brief/[slug]/                   # Daily brief public reader
  calendar/                       # Operations calendar + staff assignment
    [date]/                       # Single-day event detail
  council/                        # Council read-only dashboard
  daily-brief/                    # Daily brief authoring + archive
  dashboard/                      # Main staff dashboard (all roles)
  manager/                        # Manager command center
    payroll/                      # Pay period summary + PDF export
    reports/                      # Monthly analytics + CSV export
  messages/                       # Direct + broadcast messaging
  operations-brief/               # Operations bulletin authoring
  payroll/[slug]/                 # Pay stub reader
  profile/                        # User profile + shift history
  recognition/                    # Gamification leaderboard + badges
  settings/                       # Notification + alarm preferences
  signup/                         # Registration with role selection
  sops/                           # SOP document library
  tickets/                        # Maintenance ticket board

components/
  calendar/                       # EventTimeline, CalendarControls, StaffAssignmentModal
  council/                        # RunningVisitorCountCard, DigitalChantStandPanel
  dashboard/                      # ClockInCard, ShiftTimer, BreakCountdown, MapContext,
                                  # RoleActionCenter, OperationsActionCards, LiveVisitorCountCard
  forms/                          # MaintenanceTicketForm, IncidentReportForm, WalkthroughForm
  layout/                         # TopAppBar, DashboardMotion
  manager/                        # StaffingGaps, ShiftOptimizerPanel, AIConfigPanel, StaffTable,
                                  # ScheduleOverview, VisitorVolumeChart, MediaFolders,
                                  # DirectComms, ManagerAlertsCard, ExportDataButton
  messaging/                      # ChatWindow, ConversationList
  operations-brief/               # OperationsBriefPreview
  payroll/                        # PayrollClient
  profile/                        # ProfileCard, ScheduleList, ShiftHistory
  shared/                         # TicketCard, ManagerTicketCommand, OperationsTicketDashboard
  sops/                           # SOPUploader, SOPViewer
  theme/                          # ThemeToggle
  ui/                             # Button, Switch (base primitives)
  RecognitionMonitor.tsx          # Polls recognition events, fires badge/EOTM audio alerts
  ShiftLifecycleMonitor.tsx       # Polls clock-in state, fires break/overtime audio alerts
  WakeUpAlarmMonitor.tsx          # Polls wake-up alarm, fires pre-shift audio alert

lib/
  actions/                        # Server actions (all Supabase queries)
    after-hours.ts                # After-hours staffing validation
    auth.ts / auth-helpers.ts     # requireAuth, requireManager guards
    breaks.ts                     # Break tracking
    clock-in.ts                   # Clock in/out
    daily-brief.ts                # Daily brief CRUD + AI draft
    event-context.ts              # Current/next event lookup
    incidents.ts                  # Incident reports
    manager-alerts.ts             # Manager alert queries
    messages.ts / messages-unread.ts  # Messaging + unread counts
    notifications.ts              # Notification management
    operations-brief.ts           # Operations brief CRUD
    overtime-reduction.ts         # Overtime analysis
    payroll.ts                    # Pay period + rate calculations
    recognition.ts                # Leaderboard, badges, awards
    schedule-optimizer.ts         # AI shift optimization
    schedules.ts                  # Schedule queries
    setup-staff.ts                # Initial staff provisioning
    shift-report.ts               # Shift summary exports
    sops.ts                       # SOP document CRUD
    staffing.ts                   # Staff assignment + gap detection
    tickets.ts                    # Maintenance ticket CRUD
    visitor-volume.ts             # Visitor count tracking
    wake-up-alarm.ts              # Wake-up alarm CRUD
    walkthroughs.ts               # Walkthrough submissions
  audio/
    alert-sounds.ts               # Centralized audio key registry
  operations-brief-api.ts         # AI brief generation client

constants/index.ts                # LABOR, BREAKS, GEOFENCE, SECURITY constants
hooks/                            # Custom React hooks (useAlertAudio, etc.)
middleware.ts                     # Auth session refresh + operating hours gate
scripts/
  sync-google-calendar.js         # Google Calendar → Supabase event sync
supabase/                         # Schema SQL + migrations
types/                            # Shared TypeScript types
utils/supabase/
  client.ts                       # Browser Supabase client (singleton)
  server.ts                       # Server Supabase client + admin client
```

---

## Database

Core Supabase Postgres tables:

| Table | Purpose |
|---|---|
| `profiles` | Staff profiles linked to Supabase auth users |
| `events` | Calendar events (synced from Google Calendar) |
| `shifts` | Clock-in/out records with break tracking |
| `staff_assignments` | Event-to-staff role assignments |
| `maintenance_tickets` | Maintenance requests with status and assignment |
| `incidents` | Security/medical/visitor incident reports |
| `messages` | Direct and broadcast messages |
| `notifications` | Per-user notification queue |
| `walkthroughs` | Facility/security checklist submissions |
| `visitor_volume` | Live visitor count entries (Realtime-enabled) |
| `breaks` | Individual break records per shift |
| `media_files` | Uploaded photos/files linked to tickets/incidents |
| `sop_documents` | SOP file metadata and categories |
| `operations_briefs` | Operations bulletin drafts and versions |
| `daily_briefs` | Daily briefing records |
| `recognition_badges` | Badge definitions with point values |
| `badge_awards` | Staff badge award history |
| `recognition_points` | Staff point totals for leaderboard |
| `staff_wake_up_alarms` | Per-staff pre-shift alarm config |
| `payroll_rates` | Staff pay rate config |

Schema files are in `supabase/`. Start with `schema-canonical.sql`, then apply individual migration files.

> **Note:** FK-dependent joins (`profiles!fkey()`) are intentionally absent. All profile lookups use batch fetches (`in()` queries) due to missing FK constraints in the current schema.

---

## Deployment

### Vercel

1. Push repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the **Supabase integration** in Vercel — it auto-syncs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
4. Add remaining env vars manually in the Vercel dashboard
5. In Supabase Auth settings, set the Site URL + allowed redirect URLs to your Vercel deployment URL
6. Configure SMTP in Supabase for password reset emails
7. Enable **Realtime** on the `visitor_volume` table in the Supabase dashboard

### Notes

- `npm run dev` auto-syncs Google Calendar before starting. The sync is non-blocking — server still starts if it fails.
- On Windows, delete `.next/` before building to prevent EPERM trace file lock errors: `Remove-Item -Recurse -Force .next`
- All pages calling Supabase have `export const dynamic = 'force-dynamic'` to prevent static prerender without env vars.
- The dev bypass cookies (`shrine_dev_session`, `shrine_dev_role`) allow full role testing without real Supabase auth.

---

## License

See [LICENSE](LICENSE).
