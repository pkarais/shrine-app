# Shrine Ops — LandmarkOps

Operational command center for St. Nicholas National Shrine. Role-based dashboards for staffing, scheduling, clock-in/out with geofence, messaging, maintenance tickets, incident reporting, walkthroughs, and AI-powered shift optimization.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

---

## Roles

| Role | Access |
|------|--------|
| **Manager** | Full command center: assign tickets, view incidents, staffing gaps, shift optimizer, AI config, analytics |
| **Operations** | Dashboard, clock-in/out, walkthroughs, maintenance tickets, team messaging |
| **Security** | Dashboard, clock-in/out, security walkthroughs, incident reports, visitor tally |
| **Council** | Read-only oversight dashboard |

---

## Features

- **Clock-In / Shift Timer** — GPS geofenced clock-in/out with live elapsed timer, break tracking, overtime detection
- **Calendar & Scheduling** — Event timeline with staff assignment by role (operations, security, greeter, director)
- **Staffing Gaps** — Auto-detected uncovered events with one-click staff assignment
- **Ticket Command** — Create, assign, claim, and resolve maintenance tickets
- **Incident Reports** — Submit and review security/medical/visitor incidents with severity tracking
- **Walkthroughs** — Facility and security checklists with completion history
- **Messaging** — Direct and broadcast messaging between staff
- **Visitor Volume** — Live visitor count tracking and charting
- **Shift Optimizer** — Overtime analysis with potential savings estimates
- **AI Provider Config** — Dropdown to connect OpenAI, Google Gemini, or OpenRouter for enhanced scheduling recommendations
- **Media Upload** — Quick photo/file uploads attached to tickets and incidents

---

## Environment Variables

Create `.env.local` with these (see `.env.example` for template):

```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service_role key (server-only)
NEXT_PUBLIC_SITE_LAT=               # Shrine latitude (40.7101341)
NEXT_PUBLIC_SITE_LON=               # Shrine longitude (-74.0132028)
NEXT_PUBLIC_GEOFENCE_RADIUS=        # Geofence radius in meters (65)
GOOGLE_MAPS_API_KEY=                # Google Maps API key
GOOGLE_CALENDAR_API_KEY=            # Google Calendar API key
GOOGLE_CALENDAR_ID=                 # Calendar ID for event import
```

Optional:
```
GEMINI_API_KEY=                     # For AI-powered features
```

---

## Getting Started

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

Open http://localhost:3000. Sign up via the Register button or log in as an existing user.

### Build for production

```bash
npm run build
npm start
```

---

## Project Structure

```
app/                          # Next.js App Router pages & API routes
  calendar/                   # Operations calendar with staff assignment
  council/                    # Council oversight dashboard
  dashboard/                  # Main staff dashboard
  login/                      # Authentication
  manager/                    # Manager command center
  messages/                   # Team messaging
  profile/                    # User profile & shift history
  signup/                     # Registration with role selection
  tickets/                    # Maintenance tickets
  privacy/                    # Privacy policy
  security/                   # Security standards
  support/                    # Support terminal
components/                   # Reusable UI components
  calendar/                   # Calendar event timeline, controls
  dashboard/                  # ClockInCard, ShiftTimer, MapContext, etc.
  forms/                      # Walkthrough, incident, ticket forms
  layout/                     # TopAppBar, DashboardMotion
  manager/                    # StaffingGaps, ShiftOptimizerPanel, AIConfigPanel
  messaging/                  # ChatWindow, ConversationList
  profile/                    # ProfileCard, ScheduleList, ShiftHistory
  shared/                     # TicketCard, ManagerTicketCommand, EventStaffing
lib/actions/                  # Server actions (Supabase queries)
  tickets.ts                  # Maintenance ticket CRUD + staff queries
  messages.ts                 # Messaging + broadcast
  staffing.ts                 # Staff assignment + gap detection
  clock-in.ts                 # Clock in/out
  incidents.ts                # Incident reports
  walkthroughs.ts             # Walkthrough submissions
  notifications.ts            # Notification management
constants/index.ts            # LABOR, BREAKS, GEOFENCE, SECURITY config
supabase/                     # Schema SQL files
```

---

## Database

The app uses Supabase Postgres with these core tables:
`profiles`, `events`, `shifts`, `staff_assignments`, `maintenance_tickets`,
`incidents`, `messages`, `notifications`, `walkthroughs`, `visitor_volume`,
`breaks`, `media_files`.

Schema files are in `supabase/`. Apply to your Supabase project via the SQL editor.

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Set all 9 environment variables in Vercel dashboard
4. Add Vercel deployment URL to Supabase Auth settings (Site URL + redirect URLs)
5. Configure SMTP in Supabase for password reset flow
6. Enable Realtime on `visitor_volume` table in Supabase dashboard

---

## Notes

- All FK-dependent joins (`profiles!fkey()`) have been replaced with manual batch profile fetches (FK constraints absent in the current schema)
- Dev bypass cookies (`shrine_dev_session`, `shrine_dev_role`) allow testing without real auth in development
- `.next/cache` corruption can occur if `next build` runs while the dev server is active — restart the dev server after a build
