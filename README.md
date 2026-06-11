# Shrine Ops

> Operational command center for **St. Nicholas Greek Orthodox Church & National Shrine at the World Trade Center**, New York City.

Shrine Ops is a full-stack, role-based staff management platform purpose-built for a real-world religious landmark. It replaces paper sign-in sheets, radio communications, and spreadsheet scheduling with a unified web application accessible on any device. Every feature maps directly to a real operational need — geofenced clock-in so managers know staff are physically on-site, AI-drafted daily briefings to save manager prep time, live audio alerts for incidents, branded email delivery of monthly and daily briefs, and a gamified recognition system to improve staff morale and retention.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 — App Router, TypeScript, Server Components |
| Auth & Database | Supabase — Postgres, Row Level Security, Realtime |
| Styling | Tailwind CSS with Material Design 3 color tokens (`darkMode: 'class'`) |
| Animation | Framer Motion |
| Email Delivery | Resend — branded HTML email for daily and monthly briefs |
| PDF Generation | Puppeteer Core + @sparticuz/chromium (Vercel-compatible) |
| Testing | Vitest + Testing Library |
| Deployment | Vercel, connected to Supabase via native integration |

---

## Roles & Access

Every user account has a `role` field in the `profiles` table. The UI and server actions enforce role-based access at every layer — middleware, server components, and server actions all check the role before returning data or allowing mutations.

| Role | What they can do |
|---|---|
| **Manager** | Everything: staff table, payroll, reports, shift optimizer, ticket command, AI config, alert center, media folders, broadcast messages, schedule management, brief publishing and email delivery |
| **Operations** | Dashboard, clock-in/out, walkthroughs, maintenance tickets, direct messaging, operations brief, recognition leaderboard |
| **Security** | Dashboard, clock-in/out, security walkthroughs, incident reports, visitor tally, direct messaging |
| **Council** | Read-only oversight view: live visitor count, digital chant stand, event map, can submit maintenance tickets |

### Manager Invite Code
To prevent unauthorized manager accounts, self-registration as a manager requires a secret invite code. The default is `SHRINE2026`, configurable via `NEXT_PUBLIC_MANAGER_INVITE_CODE`. Staff registering without the code are assigned the `operations` role by default.

---

## Branding

The app uses a consistent **Saint Nicholas Shrine** brand identity throughout:

- **Color logo** (`/images/logo-color.jpg`) — shown in light mode on page headers, walkthrough forms, and dashboard greeting
- **White logo** (`/images/logo-white.png`) — shown in dark mode and on dark/navy backgrounds (nav bar dark mode, email header, operations brief hero, manager command center)
- **Theme-aware switching** — Tailwind's `darkMode: 'class'` strategy means logos switch correctly based on the in-app theme toggle, not the OS preference
- **Email header** — Both brief emails use a medium-navy (`#1a4a8c`) header with the white logo, white title text, and a gold accent border — matching the app's navy/gold design system

Logo placement by view:

| View | Logo shown |
|---|---|
| Top navigation bar | Color (light) / White (dark) — every authenticated page |
| Login page — mobile | Color (light) / White (dark), stacked above the sign-in form |
| Login page — desktop hero | White (on navy hero panel) |
| Staff dashboard | Color (light) / White (dark), above greeting |
| Manager Command Center | White (inside dark hero overlay card) |
| Council Dashboard | Color (light) / White (dark), above "Council Portal" label |
| Operations Brief page | White (inside navy hero overlay) |
| Daily Brief page | Color (light) / White (dark), above page title |
| Facility Walkthrough form | Color (light) / White (dark), above checklist header |
| Security Walkthrough form | Color (light) / White (dark), above checklist header |
| Operations Monthly Brief email | White logo on navy-blue header |
| Daily Operations Brief email | White logo on navy-blue header |

---

## Feature Reference

### Dashboard (`/dashboard`)

The main landing page for all non-council staff after login. It is server-rendered and personalized per role.

**What it contains:**
- **Top App Bar** — Navigation with unread message badge and role-aware links. Features the shrine logo (color/white based on theme), linking back to the dashboard
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
3. The coordinates are compared against the Liberty Park geofence center (configurable via env vars, defaulting to 40.7101341, -74.0132028) within a 275-meter radius
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

The manager's central hub, containing all operational widgets in a single scrollable page. The hero section features the shrine white logo on a dark overlay with a background command center image.

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

A structured daily briefing written by the manager each day and visible to all staff on their dashboard. The page header features the shrine logo above the title.

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

**Email delivery:**
- Managers can send the brief to any list of recipients via Resend
- The email uses a branded HTML template: navy-blue header with the white shrine logo, gold accent border, section cards with color-coded left borders matching the app's design tokens
- Each section body is summarized to 600 characters in the email to prevent Gmail clipping (full content available in the app/PDF)

---

### Operations Brief (`/operations-brief`)

A monthly operations bulletin for the operations team. The page hero features the white shrine logo on a dark overlay. Follows the same `draft → review → published → archived` lifecycle.

**Capabilities:**
- AI-generated first draft (calls `/api/generate-operations-brief` which uses the configured AI provider)
- PDF export — the published brief can be downloaded as a formatted PDF via `/api/generate-pdf`
- **Website URL publishing** — managers can attach a public website URL to the issue for external distribution
- **Email delivery** — send the brief to any comma-separated list of recipients via Resend
- Archive view at `/operations-brief/archive`

**Email template:**
- Navy-blue (`#1a4a8c`) header with the white shrine logo and gold bottom border
- `issue_month` is correctly parsed from `YYYY-MM-DD` format using local-time date construction (avoids off-by-one timezone errors)
- Section bodies are summarized to 600 characters per section to stay within Gmail's 102KB clip limit — all sections appear, just condensed
- Footer includes "View Online" and "Download PDF" buttons if URLs are available

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

Scheduled facility and security checklists that staff complete during their shift. Both forms display the shrine logo at the top (color in light mode, white in dark mode).

**Types:**
- **Facility walkthrough** — general inspection of public areas, restrooms, entrances (opening and closing variants)
- **Security walkthrough** — perimeter check, access point verification (opening and closing variants)

Staff submit their completed checklist with notes. Submissions are stored in the `walkthroughs` table with timestamp and user. If a scheduled walkthrough is not submitted on time, the system can log a `missed_walkthrough` alert to the manager.

Walkthroughs are accessible from the dashboard via modal overlays and from the Operations Action Cards.

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

A read-only oversight view for council members. Council members are redirected here automatically on login. The page header features the shrine logo above the "Council Portal" label.

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
- **Theme** — Toggle between light and dark mode (persisted in `localStorage`, applied via `.dark` class on `<html>`)
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
| `/login` | Email + password login via Supabase Auth. Features the shrine logo — white on the desktop hero panel, color/white toggle on mobile |
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

---

## Recent Changes

### Realtime Messaging & Supabase IO (Jun 2026)

- **`2c57aae`** — Near-realtime in-app message alerts. `sendMessage`, `sendToManagers`, and `sendGroupMessage` now fan out a `notifications` row (`type: "message"`) to every recipient except the sender. The bell subscribes to `postgres_changes` INSERT events filtered by `user_id` with a `seenIdsRef` Set for dedupe, plays a type-mapped alert sound, pulses for ~2.4s (`animate-pulse` + `animate-ping`), shows `(n) Shrine Ops` in the tab title, and fires a native OS notification (click → focus tab + route to `/messages`) when the tab is hidden and permission is granted. `/messages` requests permission once per session.
- **`b696df3`** — `supabase/enable-realtime-notifications.sql` adds `public.notifications` to the `supabase_realtime` publication and sets `REPLICA IDENTITY FULL` so the bell receives full row payloads. Run once in the Supabase SQL editor.
- **`64debe6`** — Removed the 30-second `setInterval` poll from `NotificationBell`. Now relies on the realtime subscription plus a single fetch on mount, on dropdown open, and on `visibilitychange` (tab regaining focus). Cuts bell read traffic ~95%.
- **`8f6a895`** — Calendar sync (`scripts/sync-google-calendar.js` + `/api/sync-calendar`) loads existing events in one SELECT and diffs each Google event against the existing row before issuing PATCH/UPDATE. Identical rows are skipped entirely (no disk write, no WAL, no realtime broadcast). Eliminates the ~50 wasted UPDATEs per `npm run dev` cold start.
- **Supabase SQL (dashboard-run)** — Added composite indexes `idx_messages_recipient_created`, `idx_messages_sender_created`, `idx_group_messages_conv_created`, `idx_conv_participants_user`, `idx_conv_participants_conv` so chat history queries do indexed lookups instead of table scans. `ANALYZE` refreshed planner stats.
- **Compute** — Project upgraded Nano → Micro (1 GB RAM, 2 dedicated ARM cores) so Postgres `shared_buffers` doubles and the realtime WAL poller stops contending for shared CPU.

### Performance & UX (Nov 2025)

- **`7b9e667`** — SOP PDF viewer: replaced `react-pdf` (which downloaded the full pdfjs library + worker from a CDN and re-rendered to canvas) with a native `<iframe src={signedUrl}>`. Modern browsers stream PDFs and paint within ~100ms instead of 5-15s, and get built-in zoom / page nav / search / print / download for free. A 4-second stall detector falls back to an "Open in new tab" link for iOS Safari edge cases. `react-pdf` removed from `package.json`; `pdfjs-dist` kept for the server-side schedule parser.
- **`5ed18a3`** — Migrated 11 static `<img>` tags to `next/image` across landing, dashboard, council, daily-brief, operations-brief, and walkthrough forms. Next now serves AVIF/WebP variants, lazy-loads below the fold, and sets intrinsic dimensions to avoid CLS. LCP images (landing hero, dashboard logo) get `priority`.
- **`080f6e5`** — `PresenceProvider` now diffs incoming presence id sets against the previous Set and skips state updates when membership is unchanged, preventing re-render fan-out across every `usePresence()` consumer. Context value and `isOnline` callback are memoized. Shared `EMPTY_SET` constant avoids per-render allocation.
- **`080f6e5`** — SOPs cold-load fix: `app/sops/page.tsx` hydrates categories synchronously from `sessionStorage`, and `SOPViewer` caches docs + categories + signed URLs (50-min TTL, safely under the 60-min signed-URL window). Repeat visits paint instantly; refresh happens in the background. Resolves the 60s cold-load → instant warm-load issue.

### Features (Nov 2025)

- **`6e41e61`** — Staff Online Now card on the manager command center, wired next to Direct Comms.
- **`fd6846f`** — Live online indicator across messaging: green presence dot on `ConversationList` avatars + "N online" chip in the inbox header, powered by a global `PresenceProvider` on `app:online` Supabase Realtime channel.
- **`f685bb3`** — Council members now appear in the messaging directory for all roles, and surface a purple council role badge.
- **`b74279b`** — `MarketingNav` gets a cyan-pill "Back to Dashboard" Link for authenticated users browsing the public marketing site.
- **`c102a78`** — Council page replaces the broken `bg-fixed` parallax (broken inside `overflow-hidden`/transformed ancestors) with a JS-driven `ParallaxHero` using `requestAnimationFrame` on scroll.
- **`43e8bec`** — Council page adds About/Archive nav buttons, frees the hero image from layout constraints, and expands the events list.
- **`3a21405`** — Public marketing site at `/about` with live event archive, theme toggle, and EN/EL language toggle.

### Coverage & Scheduling

- **`56d7808`, `ff13f7e`, `468bb95`, `93e9b8b`, `4675144`** — Per-event coverage evaluator + unified Who's Working / staffing-gap surfaces + synthetic Sunday Orthros inclusion + live grid edit overlays + Regular Shrine Open inheritance.
- **`9084651`** — Event coverage gaps mirror into `manager_alerts` so missed coverage shows up on the alert center.
- **`eab205e`, `d91bb29`, `787a277`, `d122960`** — My Hours work: scheduled-hours overlay, `staff_assignments` dedupe, click-to-toggle on-site/off-site, bi-weekly/monthly archive with CSV export, `location_type` tag for off-site clock-in.

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

# App URL (required for email image assets)
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com   # e.g. https://shrine-app-omega.vercel.app

# Geofence — Liberty Park, NYC defaults shown
NEXT_PUBLIC_SITE_LAT=40.7101341
NEXT_PUBLIC_SITE_LON=-74.0132028
NEXT_PUBLIC_GEOFENCE_RADIUS=275     # Radius in meters

# Google integrations (required for calendar sync and maps)
GOOGLE_MAPS_API_KEY=                # Used for the MapContext embed
GOOGLE_CALENDAR_API_KEY=            # Read-only calendar API key
GOOGLE_CALENDAR_ID=                 # Calendar ID, e.g. user@gmail.com or abc@group.calendar.google.com

# Email delivery (required for brief email sending)
RESEND_API_KEY=                     # Resend API key — get one at resend.com
RESEND_FROM_EMAIL=                  # Verified sender, e.g. Shrine Ops <briefs@yourdomain.com>

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
cp .env.example .env.local    # Fill in Supabase, Resend, and Google credentials
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
  council/                        # Council read-only dashboard (with shrine logo)
  daily-brief/                    # Daily brief management + email delivery
  daily-brief/archive/            # Archived daily briefs list
  daily-brief/[slug]/             # Individual brief reader
  dashboard/                      # Main staff dashboard (with shrine logo)
  manager/                        # Manager command center (with shrine logo hero)
  manager/payroll/                # Pay period summary + PDF export
  manager/reports/                # Monthly analytics + CSV export
  messages/                       # Direct messaging + group chats
  operations-brief/               # Monthly brief management + email delivery + URL publishing
  operations-brief/archive/       # Archived operations briefs
  payroll/[slug]/                 # Pay stub reader
  payroll/archive/                # Pay stub archive
  profile/                        # Staff profile + shift history
  recognition/                    # Leaderboard, badges, EOTM
  settings/                       # Notification prefs + theme + wake-up alarm
  signup/                         # Self-registration with role selection
  sops/                           # SOP document library
  tickets/                        # Maintenance ticket board

components/
  calendar/                       # EventTimeline, CalendarControls, StaffAssignmentModal
  council/                        # RunningVisitorCountCard, DigitalChantStandPanel
  dashboard/                      # ClockInCard, ShiftTimer, BreakCountdown, DailyBrief,
                                  # MessagingPreview, QuickSubmit, MapContext,
                                  # RoleActionCenter, OperationsActionCards, LiveVisitorCountCard
  forms/                          # MaintenanceTicketForm, IncidentReportForm,
                                  # DailyWalkthrough (with logo), SecurityWalkthrough (with logo)
  layout/                         # TopAppBar (with theme-aware shrine logo), DashboardMotion
  manager/                        # StaffingGaps, ShiftOptimizerPanel, AIConfigPanel,
                                  # StaffTable, ScheduleOverview, VisitorVolumeChart,
                                  # MediaFolders, DirectComms, ManagerAlertsCard, ExportDataButton
  messaging/                      # ChatWindow, GroupChatWindow, ConversationList
  operations-brief/               # OperationsBriefEditor, SectionCard, PublishPanel
  payroll/                        # PayPeriodSelector, PayrollSummaryTable
  profile/                        # ProfileCard, ShiftHistory, BadgeCollection
  recognition/                    # Leaderboard, BadgeAwardPanel, EOTMPanel
  shared/                         # Reusable primitives: LoadingSpinner, EmptyState, etc.
  sops/                           # SOPViewer, SOPUpload
  theme/                          # ThemeProvider (manages .dark class on <html>)
  ui/                             # Generic UI: Button, Modal, Tabs, Badge, etc.

hooks/
  useAlertAudio.ts                # Plays audio alerts by key with per-category preference gating
  useSearch.ts                    # Debounced search hook used in SOPs, staff table, etc.

lib/
  actions/                        # All Next.js server actions (server-side mutations)
    operations-brief.ts           # Operations brief CRUD + Resend email delivery
    daily-brief.ts                # Daily brief CRUD + Resend email delivery
  audio/
    alert-sounds.ts               # Registry of all audio alert keys → file paths
  calendar-defaults.ts            # Default calendar view config
  geofence.ts                     # Haversine distance calculation for geofence check
  labor-math.ts                   # Shift hour calculation, overtime flagging
  operations-brief-api.ts         # Data fetching helpers for operations brief
  overtime-analysis.ts            # Identifies staff exceeding hour thresholds
  rate-limit.ts                   # Simple in-memory rate limiter for API routes
  utils.ts                        # cn() class merger, date formatters, misc helpers

constants/
  index.ts                        # LABOR, BREAKS, GEOFENCE, ROLES, ALERT_TYPES constants

public/
  audio/                          # Audio alert files organized by category
  badges/                         # Badge image assets
  images/
    logo-color.jpg                # Color shrine logo (used in light mode)
    logo-white.png                # White shrine logo (used in dark mode and email headers)

supabase/
  schema-canonical.sql            # Full canonical schema with all tables and RLS policies
  *.sql                           # Individual migration files by feature
```

---

## Dark Mode

Dark mode is implemented via Tailwind's `class` strategy. The `ThemeProvider` component (`components/theme/ThemeProvider.tsx`) adds or removes the `.dark` class on the `<html>` element based on the user's preference stored in `localStorage` (with OS preference as the initial default).

Because `darkMode: 'class'` is set in `tailwind.config.js`, all `dark:` variant classes (e.g., `dark:hidden`, `dark:block`, `dark:bg-gray-900`) respond to the `.dark` class — not the OS media query — which means the in-app theme toggle works correctly for all components including logo switching.

---

## Email Integration

Shrine Ops uses **Resend** to send branded HTML emails for the Daily Brief and Operations Monthly Brief.

**Setup:**
1. Create a free account at [resend.com](https://resend.com)
2. Verify your sender domain or use a Resend-provided sandbox address
3. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to your env vars

**Email design:**
- Header: medium-navy (`#1a4a8c`) background with the white shrine logo, header text in white, gold accent border at the bottom
- Section cards: white background with color-coded left border per section
- Footer: links to view online and download PDF (when URLs are available)

**Gmail clipping:** Gmail silently clips HTML emails exceeding ~102KB. To prevent this, section bodies are summarized to 600 characters in the email body, with a note that the full content is available in the app and the attached PDF.

**`NEXT_PUBLIC_SITE_URL`** must be set to your production Vercel URL so email templates can reference image assets (logo) hosted by the app. If not set, the code falls back to the `VERCEL_URL` environment variable automatically provided by Vercel, then to `http://localhost:3000`.

---

## License

See [LICENSE](LICENSE) for details.
