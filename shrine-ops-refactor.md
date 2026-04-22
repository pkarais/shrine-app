# Shrine Ops Restoration Plan: Sacred Blueprint Realignment

## Overview
This plan restores the Shrine Ops application to its intended functional and aesthetic state. We will refactor the dashboard to be role-aware (Operations, Security, Manager, User), implement real-time walkthrough tracking, and re-establish critical links to the Digital Chant Stand and GOA Chapel readings.

## Project Type
**WEB** (Next.js 14 App Router + Supabase)

## Success Criteria
- [ ] **Operations/Security**: Can clock in, complete opening/closing walkthroughs, and see team schedules.
- [ ] **Managers**: Can monitor walkthrough progress and staffing in real-time.
- [ ] **Regular Users**: Can report incidents and see working staff.
- [ ] **General**: Digital Chant Stand (Iframe) and Scriptural Readings (Link) are prominently accessible.
- [ ] **Aesthetics**: Strict adherence to "No-Line" rule (tonal layering) and Manrope/Inter typography.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database/Auth**: Supabase
- **Styling**: Tailwind CSS (Sacred Blueprint Tokens)
- **Components**: Framer Motion (for "Lamborghini" feel micro-animations)

## File Structure Changes
- `app/dashboard/(roles)/`: Use route groups or a single dynamic dashboard to handle role-based logic.
- `components/dashboard/ActionCenter/`: New role-specific action modules.
- `components/shared/EventStaffing/`: Component to show who is scheduled for an event.

## Task Breakdown

### Phase 1: Foundation & Data Wiring (P0)
| Task ID | Name | Agent | Skills | Priority | Dependencies |
|---------|------|-------|--------|----------|--------------|
| T1 | **DB Schema Verification** | `database-architect` | `database-design` | P0 | None |
| T2 | **Auth-Aware Dashboard Root** | `frontend-specialist` | `react-best-practices` | P0 | T1 |

**T1 INPUT→OUTPUT→VERIFY**: Verify `profiles`, `walkthroughs`, `maintenance_tickets`, and `staff_assignments` tables in Supabase. Check RLS policies.
**T2 INPUT→OUTPUT→VERIFY**: Refactor `app/dashboard/page.tsx` to fetch the user profile and current active event. Display a "Loading" skeleton that matches the Sacred Blueprint.

### Phase 2: Action Centers (P1)
| Task ID | Name | Agent | Skills | Priority | Dependencies |
|---------|------|-------|--------|----------|--------------|
| T3 | **Operations/Security Action Center** | `frontend-specialist` | `frontend-design` | P1 | T2 |
| T4 | **Manager Oversight Panel** | `frontend-specialist` | `frontend-design` | P1 | T2 |
| T5 | **User/Public Dashboard** | `frontend-specialist` | `frontend-design` | P1 | T2 |

**T3 INPUT→OUTPUT→VERIFY**: Integrate `DailyWalkthrough` and `MaintenanceTicketForm`. Add "Clock In" functionality tied to the active event.
**T4 INPUT→OUTPUT→VERIFY**: Create a component that queries `staff_assignments` for the current event and `walkthroughs` to show "In Progress" or "Complete" status.
**T5 INPUT→OUTPUT→VERIFY**: Simple view with DCS iframe, Reading link, and "Report Incident" button.

### Phase 3: Connective Tissue (P2)
| Task ID | Name | Agent | Skills | Priority | Dependencies |
|---------|------|-------|--------|----------|--------------|
| T6 | **Digital Chant Stand Iframe** | `frontend-specialist` | `react-best-practices` | P2 | T3, T5 |
| T7 | **Team Schedule Component** | `frontend-specialist` | `react-best-practices` | P2 | T3, T4, T5 |

**T6 INPUT→OUTPUT→VERIFY**: Embed `dcs.goarch.org` iframe. Ensure it's responsive and theme-compliant. Use URL from `event.dcs_link`.
**T7 INPUT→OUTPUT→VERIFY**: Component that shows staff roles (🛡️ Security, ⚙️ Ops, 👔 Manager) for the active event.

### Phase 4: Aesthetic Refinement (P3)
| Task ID | Name | Agent | Skills | Priority | Dependencies |
|---------|------|-------|--------|----------|--------------|
| T8 | **"No-Line" Audit** | `frontend-specialist` | `frontend-design` | P3 | All |
| T9 | **Typography & Motion** | `frontend-specialist` | `ui-ux-pro-max` | P3 | All |

**T8 INPUT→OUTPUT→VERIFY**: Replace all `border-b` or `border` with `bg-surface-container` variations.
**T9 INPUT→OUTPUT→VERIFY**: Ensure Manrope is used for headers, Inter for body. Add smooth Framer Motion transitions between dashboard states.

## Phase X: Verification
- [ ] Run `python .agent/scripts/checklist.py .`
- [ ] Run `python .agent/scripts/verify_all.py . --url http://localhost:3000`
- [ ] Manual Role Test: Log in as Manager, Operations, and Regular User.
- [ ] Build Check: `npm run build` passes.

## ✅ PHASE X COMPLETE
- Lint: [ ]
- Security: [ ]
- Build: [ ]
- Date: [ ]
