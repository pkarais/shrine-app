# Shrine App Frontend Route Audit Report

## 1. Route Inventory (App Router)

### Public Routes (No Auth Required)
| Route | Type | File |
|-------|------|------|
| `/` | Landing Page | `app/page.tsx` |
| `/login` | Auth | `app/login/page.tsx` |
| `/signup` | Auth | `app/signup/page.tsx` |
| `/forgot-password` | Auth | `app/forgot-password/page.tsx` |
| `/reset-password` | Auth | `app/reset-password/page.tsx` |
| `/privacy` | Static | `app/privacy/page.tsx` |
| `/security` | Static | `app/security/page.tsx` |
| `/support` | Static | `app/support/page.tsx` |

### Protected Routes (Auth Required)
| Route | Auth Type | Role Gate | File |
|-------|-----------|-----------|------|
| `/dashboard` | Middleware + Page | Redirects council to `/council` | `app/dashboard/page.tsx` |
| `/manager` | Middleware + Page | Manager only | `app/manager/page.tsx` |
| `/council` | Middleware + Page | Council only | `app/council/page.tsx` |
| `/profile` | Middleware + Page | None | `app/profile/page.tsx` |
| `/settings` | Client-side only | Manager vs Staff UI | `app/settings/page.tsx` |
| `/calendar` | Middleware + Page | None | `app/calendar/page.tsx` |
| `/calendar/[date]` | Middleware only | None | `app/calendar/[date]/page.tsx` |
| `/messages` | Middleware + Client | None | `app/messages/page.tsx` |
| `/tickets` | Middleware + Client | Role-based tabs | `app/tickets/page.tsx` |
| `/recognition` | Middleware + Client | Manager award panel | `app/recognition/page.tsx` |
| `/operations-brief` | Middleware + Client | None | `app/operations-brief/page.tsx` |
| `/operations-brief/archive` | Middleware + Client | None | `app/operations-brief/archive/page.tsx` |

### Public but Possibly Unintended Routes
| Route | Auth Status | File |
|-------|-------------|------|
| `/brief/[slug]` | **Public** — no middleware auth, no page auth | `app/brief/[slug]/page.tsx` |
| `/audio-test` | **Public** — middleware runs but does not require auth | `app/audio-test/page.tsx` |

---

## 2. Per-Page Detailed Analysis

### `/dashboard` (Server Component)
- **Data fetched**: `profiles`, `events`, `operations_summary`, `staff_assignments`, `walkthroughs`, `visitor_count`
- **Server actions**: `getCurrentOrNextEvent`, `getOperationsSummary`, `getStaffForEvent`
- **Components used**: `ClockInCard`, `ShiftTimer`, `BreakCountdown`, `DailyBrief`, `MessagingPreview`, `QuickSubmit`, `MapContext`, `RoleActionCenter`, `OperationsActionCards`, `LiveVisitorCountCard`, `TopAppBar`, `DashboardMotion`
- **Auth**: Middleware + page-level dev bypass (`shrine_dev_session` cookie). Checks user and shows auth-required UI if missing.
- **Issues**: Line 112 has a raw `<img>` tag (`/images/chatpg.jpg`) with no apparent functional purpose — possible leftover placeholder.
- **Status**: Fully wired

### `/manager` (Server Component)
- **Data fetched**: `incidents`, `shifts`, `profiles`, `visitor_volume`, `messages`, `events`, `walkthroughs`, `staff_assignments`
- **Server actions**: `getManagerIncidents`, `analyzeOvertime`
- **Components used**: `VisitorVolumeChart`, `MediaFolders`, `DirectComms`, `ShiftOptimizerPanel`, `StaffingGaps`, `ManagerAlertsCard`, `AIConfigPanel`, `StaffTable`, `ScheduleOverview`, `OvertimeAlerts`, `WalkthroughActivity`, `ManagerTicketCommand`, `TopAppBar`
- **Auth**: Middleware + page-level role check (`manager` only). Returns "Manager Access Only" UI for non-managers.
- **Status**: Fully wired

### `/recognition` (Client Component)
- **Data fetched**: Profile, leaderboard, badges, badge awards, point rules, point events, EOM candidates
- **Server actions**: `getRecognitionPageData`, `awardBadgeToEmployee`, `getStaffForBadgeAwarding`
- **Components used**: `TopAppBar`, plus 20+ inline sub-components (`RecognitionSkeleton`, `StatCard`, `LeaderboardTable`, `BadgeAwardsGrid`, `ManagerBadgeAwardPanel`, etc.)
- **Auth**: Middleware + client-side auth check (`supabase.auth.getUser()`). Shows data even if unauthenticated (profile is null, `isManager` false).
- **Issues**: `ManagerBadgeAwardPanel` inline component is very large (172 lines inside the page). `getStaffForBadgeAwarding` returns all active staff_directory entries but does not explicitly filter to `operations`/`security` per AGENTS.md convention (the server action `awardBadgeToEmployee` does validate role before awarding, however).
- **Status**: Fully wired

### `/messages` (Client Component)
- **Data fetched**: None at page level; `ConversationList` and `ChatWindow` fetch their own data.
- **Components used**: `ConversationList`, `ChatWindow`, `TopAppBar`
- **Auth**: Middleware only. Page has no explicit auth check.
- **Issues**: Properly wraps `useSearchParams` in `<Suspense>` per AGENTS.md convention.
- **Status**: Fully wired

### `/operations-brief` (Client Component)
- **Data fetched**: User profile, brief issue/sections (via API), PDF generation
- **Server actions**: `generateOperationsBriefDraft`, `updateIssueStatus`, `updateIssueField` (dynamic imports)
- **API calls**: `/api/generate-pdf`, `/api/generate-operations-brief`
- **Components used**: `TopAppBar`, `OperationsBriefPreview`
- **Auth**: Middleware + client-side auth check.
- **Issues**: **Unhandled promise rejections** in `useEffect` (lines 47–54):
  ```ts
  supabase.auth.getUser().then((result) => { ... })
  // and nested:
  supabase.from("profiles").select(...).then((pResult) => { ... })
  ```
  Neither chain has a `.catch()` handler. Failures will cause uncaught promise warnings.
- **Status**: Wired, but has runtime stability risk

### `/login` (Client Component)
- **Data fetched**: Supabase auth sign-in
- **Components used**: `ThemeToggle`
- **Auth**: None (this is the login page)
- **Issues**: Hardcoded footer text and version string. Two buttons both route to `/signup` ("Register" and "New Account" are redundant).
- **Status**: Fully wired

### `/calendar` (Server Component)
- **Data fetched**: `events`, `profiles`, `staff_directory`, `staff_assignments`, `shifts`
- **Server actions**: `injectSundayOrthros`
- **Data modules**: `getScheduleForDateRange` (hardcoded schedule data)
- **Components used**: `TopAppBar`, `CalendarControls`, `CalendarEventTimeline`, `RecurringScheduleCalendar`
- **Auth**: Middleware + page-level dev bypass.
- **Issues**: 
  - Lines 88–89: `console.log` and `console.error` debug statements should be removed.
  - Lines 265–269: Hardcoded `SCHEDULE_ROLE_MAP` mapping specific staff names (`Paul`, `Fabio`, `Josh`, etc.) to roles. This is brittle and should come from the database.
- **Status**: Fully wired

### `/calendar/[date]` (Server Component)
- **Data fetched**: `events`, `shifts`, `profiles`
- **Auth**: Protected by middleware (starts with `/calendar/`), but **no page-level auth check**.
- **Status**: Fully wired

### `/tickets` (Client Component)
- **Data fetched**: Tickets (assigned, unassigned, my), operations staff list
- **Server actions**: `getUnassignedTickets`, `getAssignedTickets`, `getUserTickets`, `getOperationsStaff`, `assignTicket`, `unassignTicket`, `claimTicket`, `completeTicket`
- **Components used**: `TopAppBar`, `Button`, `TicketCard`, `TicketCardGroup`, `MaintenanceTicketForm`
- **Auth**: Middleware + client-side auth.
- **Issues**: **Critical**: Uses `redirect` from `next/navigation` inside an async callback (`startTransition`). `redirect` only works during rendering in Client Components, not inside event handlers/async effects. Should use `useRouter().push("/login")`.
- **Status**: Wired, but has a broken auth redirect pattern

### `/profile` (Server Component)
- **Data fetched**: `profiles`, `events`, `staff_assignments`, `shifts`
- **Components used**: `TopAppBar`, `ProfileCard`, `ScheduleList`, `ShiftHistory`
- **Auth**: Middleware + page-level dev bypass.
- **Status**: Fully wired

### `/settings` (Client Component)
- **Data fetched**: Wake-up alarm, alert settings
- **Server actions**: `getWakeUpAlarm`, `setWakeUpAlarm`, `deleteWakeUpAlarm`
- **Components used**: `TopAppBar`, `Switch`, `Button`, `useAlertAudio`
- **Auth**: **Client-side only**. Middleware runs but does NOT require auth for `/settings`. An unauthenticated user can see the Settings UI (staff wake-up alarm view) before any client-side redirect or check.
- **Issues**: Console errors in catch blocks (acceptable during development but should use a toast/logger in production).
- **Status**: Wired, but auth is weak

### `/council` (Server Component)
- **Data fetched**: `events`, `visitor_volume`
- **Server actions**: `getCurrentOrNextEvent`
- **Components used**: `TopAppBar`, `MaintenanceTicketForm`, `RunningVisitorCountCard`, `DigitalChantStandPanel`
- **Auth**: Middleware + page-level role check (`council` only).
- **Status**: Fully wired

### `/brief/[slug]` (Server Component)
- **Data fetched**: Issue and sections by slug
- **Server actions**: `fetchIssueBySlug`
- **Auth**: **None**. Not in middleware `authRequiredPaths`, and page has no auth check. This page is **publicly accessible**.
- **Status**: Fully wired for data, but missing auth

### `/operations-brief/archive` (Client Component)
- **Data fetched**: Brief archive list
- **API/Server actions**: `fetchOperationsBriefArchive`
- **Components used**: `TopAppBar`
- **Auth**: Middleware + client-side.
- **Status**: Fully wired

### `/audio-test` (Client Component)
- **Data fetched**: Static `ALERT_SOUND_LIST`
- **Components used**: `TopAppBar`
- **Auth**: **None**. Middleware does not require auth for `/audio-test`, and page has no auth check.
- **Status**: Static page, no auth

### `/privacy`, `/security`, `/support` (Client Components)
- **Data**: Static content
- **Auth**: None (public informational pages)
- **Issues**: Hardcoded email `polichronis369@gmail.com` across all three. Version strings hardcoded (`v4.2.0`).
- **Status**: Static, fully wired

### `/forgot-password`, `/reset-password` (Client Components)
- **Data**: Supabase auth
- **Auth**: None
- **Issues**: Hardcoded version `v0.1.0` (inconsistent with `v4.2.0` on other pages).
- **Status**: Fully wired

### `/signup` (Client Component)
- **Data**: Supabase auth sign-up
- **Auth**: None
- **Issues**: Properly wraps form in `<Suspense>`.
- **Status**: Fully wired

---

## 3. Middleware Analysis (`middleware.ts`)

### Route Protection Logic
- **Protected paths**: `/dashboard`, `/manager`, `/profile`, `/messages`, `/tickets`, `/recognition`, `/calendar`, `/operations-brief`, `/council`
- **Unprotected paths (matcher exclusion)**: `_next/static`, `_next/image`, `favicon.ico`, `api/*`, `login`, `signup`, `forgot-password`, `reset-password`, `privacy`, `security`, `support`
- **Auth mechanism**: Supabase SSR session check + optional `shrine_dev_session` cookie bypass
- **Operating hours check**: `isWithinOperatingHours()` is defined but **never used** in the middleware.

### Middleware Gaps
1. **`/settings`** is not in `authRequiredPaths` — middleware does not enforce auth.
2. **`/brief/[slug]`** is not in `authRequiredPaths` — middleware does not enforce auth.
3. **`/audio-test`** is not in `authRequiredPaths` — middleware does not enforce auth.
4. **`isWithinOperatingHours`** is exported but never called. If intended for after-hours access control, it is not wired.

---

## 4. Broken Imports / Missing Components

**Result: None found.**

All imported components, server actions, hooks, and data modules exist on disk:
- ✅ All `@/components/*` imports resolve
- ✅ All `@/lib/actions/*` imports resolve
- ✅ All `@/hooks/*` imports resolve
- ✅ All `@/data/*` imports resolve
- ✅ All `@/utils/*` imports resolve

---

## 5. Pages with Missing Data Connections

**Result: None found.**

Every page that displays data either:
- Fetches directly via server-side Supabase queries, or
- Calls server actions, or
- Delegates to client components that fetch their own data.

---

## 6. Auth Issues Summary

| Severity | Page | Issue |
|----------|------|-------|
| **Critical** | `/brief/[slug]` | Completely public — no middleware or page auth. Sensitive operational briefs could be exposed. |
| **High** | `/audio-test` | Completely public — internal audio tester exposed. |
| **High** | `/tickets` | Uses `redirect()` from `next/navigation` inside a client-side async callback. Will not actually redirect unauthenticated users. |
| **Medium** | `/settings` | Only client-side auth. Unauthenticated users see the settings UI before JS auth check runs. |
| **Medium** | `/operations-brief` | Unhandled promise rejections in `useEffect` could leak auth state errors or crash. |
| **Low** | `/calendar/[date]` | Only middleware auth; no page-level fallback. Relying solely on middleware is acceptable but inconsistent with other pages. |

---

## 7. Hardcoded Values / TODOs

| Location | Value | Risk |
|----------|-------|------|
| `calendar/page.tsx:265-269` | `SCHEDULE_ROLE_MAP` — maps `Paul→director`, `Fabio→operations`, etc. | High — brittle, must be updated manually when staff changes. Should query `staff_directory` or `profiles`. |
| `data/employee-schedules.ts` | Entire file is hardcoded shift schedules for May–June 2026 | Medium — will become stale. Needs admin UI or CSV import. |
| `login/page.tsx:239` | `"Operational Portal v4.2.0"` | Low — version drift across pages. |
| `reset-password/page.tsx:137` | `"Operational Portal v0.1.0"` | Low — inconsistent version. |
| `forgot-password/page.tsx:108` | `"Operational Portal v0.1.0"` | Low — inconsistent version. |
| `privacy/security/support` | `polichronis369@gmail.com` | Low — hardcoded contact email. |
| `dashboard/page.tsx:112` | `<img src="/images/chatpg.jpg" ...>` | Low — appears to be a placeholder image with no functional purpose. |

**No explicit `TODO` comments were found** in the key page files.

---

## 8. Console Errors / Unhandled Promises

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `calendar/page.tsx` | 88 | `console.log("[CALENDAR DEBUG]...")` — debug log in production | Low |
| `calendar/page.tsx` | 89 | `console.error("[CALENDAR DEBUG] Error:", error)` — debug error | Low |
| `operations-brief/page.tsx` | 47–54 | `.then()` chains without `.catch()` — unhandled promise rejection | **Medium** |
| `recognition/page.tsx` | 56 | `console.error("Error fetching recognition data:", err)` | Low (acceptable) |
| `settings/page.tsx` | 304, 319, 332 | `console.error` in alarm CRUD catch blocks | Low (acceptable) |
| `tickets/page.tsx` | 80 | `console.error("Error fetching data:", err)` | Low (acceptable) |

---

## 9. Recommendations

### Immediate Fixes (High Priority)
1. **Add `/brief/[slug]` to middleware authRequiredPaths** or add a page-level auth check. Operations briefs should not be public.
2. **Add `/audio-test` to middleware authRequiredPaths** or remove the route before production.
3. **Add `/settings` to middleware authRequiredPaths**.
4. **Fix `/tickets` redirect**: Replace `redirect("/login")` with `const router = useRouter(); router.push("/login")` in the client component.
5. **Fix unhandled promises in `/operations-brief`**: Add `.catch()` to the `supabase.auth.getUser()` and `supabase.from("profiles")` promise chains in `useEffect`.

### Cleanup (Medium Priority)
6. **Remove debug logs** from `calendar/page.tsx` (lines 88–89).
7. **Remove or replace the placeholder `<img>`** in `dashboard/page.tsx` line 112.
8. **Standardize version strings** across public pages (`v4.2.0` vs `v0.1.0`). Consider reading from `package.json` or an environment variable.
9. **Refactor hardcoded `SCHEDULE_ROLE_MAP`** in `calendar/page.tsx` to query from `profiles` or `staff_directory`.
10. **Refactor the inline `ManagerBadgeAwardPanel`** in `recognition/page.tsx` into its own component file for maintainability.

### Architecture Improvements (Low Priority)
11. **Use consistent auth patterns**: Either rely on middleware exclusively (and remove redundant page checks) or keep defense-in-depth. Currently the mix is inconsistent.
12. **Wire up `isWithinOperatingHours`** in `middleware.ts` if after-hours restrictions are still intended, or remove the dead code.
13. **Move hardcoded email** in privacy/security/support pages to a config constant or environment variable.
