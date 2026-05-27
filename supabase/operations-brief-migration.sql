-- Operations Monthly Brief Generator Add-On
-- Run after the recognition/gamification/reminder add-on has been installed.

insert into storage.buckets (id, name, public)
values
  ('operations-briefs', 'operations-briefs', false),
  ('operations-brief-public', 'operations-brief-public', true)
on conflict (id) do nothing;

create table if not exists public.operations_brief_issues (
  id uuid primary key default gen_random_uuid(),
  issue_month date not null,
  title text not null,
  slug text not null unique,
  opening_message text,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  visibility text not null default 'staff',
  prepared_by uuid references public.profiles(id),
  published_at timestamptz,
  pdf_url text,
  website_url text,
  archive_enabled boolean default true,
  content jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(issue_month)
);

create table if not exists public.operations_brief_sections (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.operations_brief_issues(id) on delete cascade,
  section_key text not null,
  section_title text not null,
  section_order integer not null,
  content jsonb default '{}',
  markdown_body text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(issue_id, section_key)
);

create table if not exists public.operations_brief_assets (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.operations_brief_issues(id) on delete cascade,
  asset_type text not null,
  title text,
  file_url text not null,
  storage_path text,
  created_at timestamptz default now()
);

create index if not exists idx_operations_brief_issues_status on public.operations_brief_issues(status);
create index if not exists idx_operations_brief_issues_issue_month on public.operations_brief_issues(issue_month);
create index if not exists idx_operations_brief_sections_issue_id on public.operations_brief_sections(issue_id);

create or replace view public.v_operations_brief_archive as
select
  i.id,
  i.issue_month,
  i.title,
  i.slug,
  i.opening_message,
  i.status,
  i.visibility,
  i.pdf_url,
  i.website_url,
  i.published_at,
  i.archive_enabled,
  i.created_at,
  i.updated_at,
  p.full_name as prepared_by_name
from public.operations_brief_issues i
left join public.profiles p on p.id = i.prepared_by
where i.archive_enabled = true;

create or replace function public.generate_operations_brief_draft(
  p_issue_month date,
  p_prepared_by uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_issue_id uuid;
  v_month_start date;
  v_month_end date;
  v_title text;
  v_slug text;
  v_events_supported integer;
  v_staff_assignments integer;
  v_completed_shifts integer;
  v_opening_walkthroughs integer;
  v_closing_walkthroughs integer;
  v_tickets_created integer;
  v_tickets_resolved integer;
  v_incidents_reported integer;
  v_badges_awarded integer;
  v_total_points integer;
  v_eom_candidates integer;
  v_top_leaderboard jsonb;
  v_badge_highlights jsonb;
  v_facility_updates jsonb;
  v_incident_summary jsonb;
  v_event_summary jsonb;
  v_opening_message text;
begin
  v_month_start := date_trunc('month', p_issue_month)::date;
  v_month_end := (date_trunc('month', p_issue_month) + interval '1 month - 1 day')::date;
  v_title := 'Operations Monthly Brief — ' || to_char(v_month_start, 'FMMonth YYYY');
  v_slug := lower(regexp_replace('operations-monthly-brief-' || to_char(v_month_start, 'YYYY-MM'), '[^a-zA-Z0-9-]+', '-', 'g'));

  select count(*) into v_events_supported
  from public.events
  where start_time::date between v_month_start and v_month_end;

  select count(*) into v_staff_assignments
  from public.staff_assignments
  where created_at::date between v_month_start and v_month_end
     or shift_start::date between v_month_start and v_month_end;

  select count(*) into v_completed_shifts
  from public.shifts
  where clock_in::date between v_month_start and v_month_end;

  select count(*) into v_opening_walkthroughs
  from public.walkthroughs
  where completed_at::date between v_month_start and v_month_end
    and lower(walkthrough_type) = 'opening';

  select count(*) into v_closing_walkthroughs
  from public.walkthroughs
  where completed_at::date between v_month_start and v_month_end
    and lower(walkthrough_type) = 'closing';

  select count(*) into v_tickets_created
  from public.maintenance_tickets
  where created_at::date between v_month_start and v_month_end;

  select count(*) into v_tickets_resolved
  from public.maintenance_tickets
  where resolved_at::date between v_month_start and v_month_end
     or (updated_at::date between v_month_start and v_month_end and lower(status) in ('resolved','closed','complete','completed','approved','done'));

  select count(*) into v_incidents_reported
  from public.incidents
  where created_at::date between v_month_start and v_month_end;

  select count(*) into v_badges_awarded
  from public.employee_badge_awards
  where awarded_at::date between v_month_start and v_month_end;

  select coalesce(sum(points), 0) into v_total_points
  from public.gamification_point_events
  where event_date between v_month_start and v_month_end;

  select count(*) into v_eom_candidates
  from public.v_employee_of_month_candidates
  where eligible_for_employee_of_month = true;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_top_leaderboard
  from (
    select rank, display_name, total_points, badges_earned, tasks_completed, walkthroughs_completed, on_time_count, late_count
    from public.v_current_month_leaderboard
    order by rank
    limit 5
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_badge_highlights
  from (
    select p.full_name, rb.name as badge_name, eba.badge_level, eba.reason, eba.awarded_at
    from public.employee_badge_awards eba
    join public.profiles p on p.id = eba.employee_id
    join public.recognition_badges rb on rb.id = eba.badge_id
    where eba.awarded_at::date between v_month_start and v_month_end
    order by eba.awarded_at desc
    limit 20
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_facility_updates
  from (
    select title, priority, status, created_at, resolved_at
    from public.maintenance_tickets
    where created_at::date between v_month_start and v_month_end
       or resolved_at::date between v_month_start and v_month_end
    order by coalesce(resolved_at, updated_at, created_at) desc
    limit 20
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_incident_summary
  from (
    select incident_date, location, incident_types, severity, description
    from public.incidents
    where created_at::date between v_month_start and v_month_end
    order by created_at desc
    limit 20
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_event_summary
  from (
    select title, category, start_time, required_ops, required_security, required_greeter
    from public.events
    where start_time::date between v_month_start and v_month_end
    order by start_time asc
    limit 25
  ) x;

  v_opening_message := 'This month, the Operations Team continued its work to keep the building clean, safe, prepared, and welcoming. This brief summarizes facilities updates, safety observations, service and event readiness, team recognition, leaderboard highlights, and priorities for the month ahead.';

  insert into public.operations_brief_issues (
    issue_month,
    title,
    slug,
    opening_message,
    prepared_by,
    status,
    visibility,
    content
  ) values (
    v_month_start,
    v_title,
    v_slug,
    v_opening_message,
    p_prepared_by,
    'draft',
    'staff',
    jsonb_build_object(
      'month_start', v_month_start,
      'month_end', v_month_end,
      'metrics', jsonb_build_object(
        'events_supported', v_events_supported,
        'staff_assignments', v_staff_assignments,
        'completed_shifts', v_completed_shifts,
        'opening_walkthroughs', v_opening_walkthroughs,
        'closing_walkthroughs', v_closing_walkthroughs,
        'tickets_created', v_tickets_created,
        'tickets_resolved', v_tickets_resolved,
        'incidents_reported', v_incidents_reported,
        'badges_awarded', v_badges_awarded,
        'total_points', v_total_points,
        'employee_of_month_candidates', v_eom_candidates
      )
    )
  )
  on conflict (issue_month)
  do update set
    title = excluded.title,
    opening_message = excluded.opening_message,
    prepared_by = coalesce(excluded.prepared_by, public.operations_brief_issues.prepared_by),
    content = excluded.content,
    updated_at = now()
  returning id into v_issue_id;

  insert into public.operations_brief_sections (issue_id, section_key, section_title, section_order, content, markdown_body)
  values
  (v_issue_id, 'at_a_glance', 'This Month at a Glance', 10,
    jsonb_build_object(
      'events_supported', v_events_supported,
      'staff_assignments', v_staff_assignments,
      'completed_shifts', v_completed_shifts,
      'opening_walkthroughs', v_opening_walkthroughs,
      'closing_walkthroughs', v_closing_walkthroughs,
      'tickets_created', v_tickets_created,
      'tickets_resolved', v_tickets_resolved,
      'incidents_reported', v_incidents_reported,
      'badges_awarded', v_badges_awarded,
      'total_points', v_total_points,
      'employee_of_month_candidates', v_eom_candidates
    ),
    'This month included ' || v_events_supported || ' events, ' || v_completed_shifts || ' completed shifts, ' || (v_opening_walkthroughs + v_closing_walkthroughs) || ' walkthrough submissions, and ' || v_tickets_resolved || ' resolved maintenance tickets.'
  ),
  (v_issue_id, 'facilities_maintenance', 'Facilities & Maintenance Updates', 20,
    jsonb_build_object('items', v_facility_updates),
    'Facilities and maintenance activity for the month is summarized from maintenance tickets and operational updates.'
  ),
  (v_issue_id, 'security_safety', 'Security & Safety Watch', 30,
    jsonb_build_object('incidents', v_incident_summary),
    'Safety and security activity is summarized from incident reports, walkthrough notes, and related operational records.'
  ),
  (v_issue_id, 'event_readiness', 'Service & Event Readiness', 40,
    jsonb_build_object('events', v_event_summary),
    'Event readiness activity includes supported services, meetings, staff assignments, setups, resets, and operational coverage.'
  ),
  (v_issue_id, 'recognition_badges', 'Team Recognition & Badge Highlights', 50,
    jsonb_build_object('badges', v_badge_highlights),
    'Team recognition highlights badge awards, standout contributions, and staff performance connected to the recognition program.'
  ),
  (v_issue_id, 'leaderboard', 'Leaderboard Highlights', 60,
    jsonb_build_object('top_5', v_top_leaderboard),
    'The leaderboard highlights top monthly recognition scores while keeping detailed accountability records manager-facing.'
  ),
  (v_issue_id, 'sop_spotlight', 'SOP Spotlight', 70,
    jsonb_build_object('sop_title', 'Opening and Closing Walkthrough Standards'),
    'This month’s SOP spotlight focuses on completing opening and closing walkthroughs honestly, thoroughly, and on time.'
  ),
  (v_issue_id, 'supplies_vendors_equipment', 'Supply, Vendor & Equipment Notes', 80,
    jsonb_build_object('notes', 'Add supply, vendor, and equipment notes during manager review.'),
    'Supply, vendor, and equipment notes should be reviewed monthly and connected to open maintenance tickets where appropriate.'
  ),
  (v_issue_id, 'next_month_priorities', 'Next Month Priorities', 90,
    jsonb_build_object('priorities', jsonb_build_array(
      'Review open maintenance tickets.',
      'Improve walkthrough consistency.',
      'Monitor attendance and geo-fence accountability.',
      'Publish the monthly brief to the Operations Website archive.'
    )),
    'Next month’s priorities should focus on open maintenance, event readiness, walkthrough quality, attendance accountability, and staff recognition.'
  ),
  (v_issue_id, 'staff_reminders', 'Staff Reminder Settings', 100,
    jsonb_build_object(
      'reminder_types', jsonb_build_array(
        'Wake-up reminder',
        'Leave-now reminder',
        'Shift start reminder',
        'Opening walkthrough reminder',
        'Closing walkthrough reminder',
        'Task due soon reminder',
        'Photo required reminder',
        'End-of-shift reminder'
      )
    ),
    'Staff are encouraged to set useful reminders in the Operations App to help with punctuality, checklist completion, task deadlines, and event readiness. Use reminders before they become warnings — a good reminder setup helps avoid late arrivals, missed walkthroughs, incomplete tasks, and lost points. Each reminder displays text even when audio plays, so notifications remain visible if the phone is muted or connected to Bluetooth.'
  )
  on conflict (issue_id, section_key)
  do update set
    section_title = excluded.section_title,
    section_order = excluded.section_order,
    content = excluded.content,
    markdown_body = excluded.markdown_body,
    updated_at = now();

  return v_issue_id;
end;
$$;

create or replace function public.publish_operations_brief(
  p_issue_id uuid,
  p_website_url text default null,
  p_pdf_url text default null
)
returns uuid
language plpgsql
security definer
as $$
begin
  update public.operations_brief_issues
  set
    status = 'published',
    published_at = coalesce(published_at, now()),
    website_url = coalesce(p_website_url, website_url),
    pdf_url = coalesce(p_pdf_url, pdf_url),
    updated_at = now()
  where id = p_issue_id;

  return p_issue_id;
end;
$$;

