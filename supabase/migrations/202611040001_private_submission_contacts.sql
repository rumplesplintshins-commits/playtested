-- Merge 24: private developer contact preferences. Apply to staging first.
-- Separate from publicly readable game submissions and catalogue views.
begin;

create table if not exists public.game_submission_contacts (
  submission_id uuid primary key references public.game_submissions(id) on delete cascade,
  developer_id uuid not null references auth.users(id),
  contact_email text,
  contact_discord text,
  contact_reddit text,
  contact_allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint game_submission_contacts_email_length check (contact_email is null or length(contact_email) <= 254),
  constraint game_submission_contacts_discord_length check (contact_discord is null or length(contact_discord) <= 100),
  constraint game_submission_contacts_reddit_length check (contact_reddit is null or length(contact_reddit) <= 100),
  constraint game_submission_contacts_email_format check (contact_email is null or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$')
);

alter table public.game_submission_contacts enable row level security;
revoke all on public.game_submission_contacts from public, anon, authenticated;
grant select, insert, update, delete on public.game_submission_contacts to authenticated;

drop policy if exists "Developer can read own submission contact" on public.game_submission_contacts;
create policy "Developer can read own submission contact"
on public.game_submission_contacts for select to authenticated
using (developer_id = (select auth.uid()) and exists (
  select 1 from public.game_submissions s
  where s.id = submission_id and s.developer_id = (select auth.uid())
));

drop policy if exists "Developer can create own submission contact" on public.game_submission_contacts;
create policy "Developer can create own submission contact"
on public.game_submission_contacts for insert to authenticated
with check (developer_id = (select auth.uid()) and exists (
  select 1 from public.game_submissions s
  where s.id = submission_id and s.developer_id = (select auth.uid())
));

drop policy if exists "Developer can update own submission contact" on public.game_submission_contacts;
create policy "Developer can update own submission contact"
on public.game_submission_contacts for update to authenticated
using (developer_id = (select auth.uid()) and exists (
  select 1 from public.game_submissions s
  where s.id = submission_id and s.developer_id = (select auth.uid())
))
with check (developer_id = (select auth.uid()) and exists (
  select 1 from public.game_submissions s
  where s.id = submission_id and s.developer_id = (select auth.uid())
));

drop policy if exists "Developer can delete own submission contact" on public.game_submission_contacts;
create policy "Developer can delete own submission contact"
on public.game_submission_contacts for delete to authenticated
using (developer_id = (select auth.uid()) and exists (
  select 1 from public.game_submissions s
  where s.id = submission_id and s.developer_id = (select auth.uid())
));

-- Admin access must use an authenticated server-side service-role route;
-- never expose service credentials in the browser or grant public SELECT.
commit;
