-- Marketing site: allow anonymous read of published archived briefs,
-- and seed the launch post so it appears in /about/archive.

-- Make sure RLS is on (no-op if already enabled).
alter table public.operations_brief_issues enable row level security;
alter table public.operations_brief_sections enable row level security;

-- Anonymous SELECT: published + archive_enabled only.
drop policy if exists "Public can read published archived briefs" on public.operations_brief_issues;
create policy "Public can read published archived briefs"
  on public.operations_brief_issues
  for select
  to anon
  using (status = 'published' and archive_enabled = true);

drop policy if exists "Public can read sections of published briefs" on public.operations_brief_sections;
create policy "Public can read sections of published briefs"
  on public.operations_brief_sections
  for select
  to anon
  using (
    exists (
      select 1
      from public.operations_brief_issues i
      where i.id = operations_brief_sections.issue_id
        and i.status = 'published'
        and i.archive_enabled = true
    )
  );

-- Seed the launch post. Idempotent via unique(issue_month) + unique(slug).
insert into public.operations_brief_issues (
  issue_month,
  title,
  slug,
  opening_message,
  status,
  visibility,
  published_at,
  website_url,
  archive_enabled
)
values (
  date '2026-06-01',
  'Introducing Shrine Ops',
  'introducing-shrine-ops',
  'The operational source of truth for St. Nicholas Greek Orthodox Church & National Shrine. A polished public-facing overview of the platform and how it simplifies daily operations.',
  'published',
  'public',
  now(),
  '/about/blog/introducing-shrine-ops',
  true
)
on conflict (slug) do update
  set title = excluded.title,
      opening_message = excluded.opening_message,
      status = 'published',
      website_url = excluded.website_url,
      archive_enabled = true,
      published_at = coalesce(public.operations_brief_issues.published_at, excluded.published_at);
