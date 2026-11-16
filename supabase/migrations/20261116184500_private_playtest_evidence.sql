-- Issue #66: supporting evidence is private, unlike accepted public feedback.
-- ISOLATED DEVELOPMENT MIGRATION. Do not apply to production until restore + IDOR gates pass.
create table if not exists public.playtest_private_evidence (
  test_id uuid primary key references public.community_game_tests(id) on delete cascade,
  document_url text,
  recording_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint playtest_evidence_not_empty check (document_url is not null or recording_url is not null)
);
alter table public.playtest_private_evidence enable row level security;
revoke all on public.playtest_private_evidence from public, anon, authenticated;

create table if not exists public.playtest_private_evidence_audit (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.community_game_tests(id) on delete cascade,
  actor_id uuid not null,
  action text not null,
  previous_public_feedback text,
  previous_document_url text,
  previous_recording_url text,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.playtest_private_evidence_audit enable row level security;
revoke all on public.playtest_private_evidence_audit from public, anon, authenticated;

create or replace function public._playtest_safe_evidence_url(p_url text, p_kind text)
returns text
language plpgsql stable
set search_path = ''
as $func$
declare
  v_url text := nullif(btrim(p_url),'');
  v_host text;
  v_path text;
begin
  if v_url is null then return null; end if;
  if length(v_url)>2048 or v_url ~ '[[:cntrl:][:space:]<>\"\\]' or
     v_url !~* '^https://[a-z0-9][a-z0-9.-]+(/[^[:space:]]*)?$' then
    raise exception 'Use a valid HTTPS link without spaces or credentials.';
  end if;
  v_host := lower(substring(v_url from '^https://([^/]+)'));
  v_path := lower(substring(v_url from '^https://[^/]+(.*)$'));
  if v_host is null or position('..' in v_host)>0 then
    raise exception 'The evidence link host is invalid.';
  end if;
  if p_kind='document' then
    if v_host not in ('docs.google.com','drive.google.com','www.dropbox.com','dropbox.com','onedrive.live.com') and
       v_path !~ '\.(pdf|docx|doc|odt|txt|md)(\?|#|$)' then
       raise exception 'Document evidence must be a supported document or document-sharing link.';
    end if;
  elsif p_kind='recording' then
    if v_host not in ('drive.google.com','www.youtube.com','youtube.com','youtu.be','vimeo.com','www.vimeo.com','www.dropbox.com','dropbox.com') and
       v_path !~ '\.(mp4|webm|mov)(\?|#|$)' then
       raise exception 'Recording evidence must be a supported video-sharing or direct video link.';
    end if;
  else
    raise exception 'Unsupported private evidence kind.';
  end if;
  return v_url;
end;
$func$;
revoke all on function public._playtest_safe_evidence_url(text,text) from public,anon,authenticated;

create or replace function public._playtest_public_comment_is_safe(p_text text)
returns boolean language sql immutable set search_path=''
as $func$
  select coalesce(p_text,'') !~* '(https?://|www[.]|[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,})';
$func$;
revoke all on function public._playtest_public_comment_is_safe(text) from public,anon,authenticated;

-- Previous read policy exposed raw community_game_tests rows for ANY approved game
-- to every logged-in user, including pending feedback and tester UUIDs.
-- Keep "Testers can view own tests" for the submitter; all other identities
-- must use authenticated, scoped developer/admin/public RPC projections.
drop policy if exists "Authenticated users can view approved game tests"
  on public.community_game_tests;

-- Prevent old clients and admin interfaces from publishing a document link or email in an accepted report.
-- Existing accepted reports are not rewritten and must be audited separately before publication.
create or replace function public._guard_public_test_feedback_privacy()
returns trigger language plpgsql security definer set search_path=''
as $func$
begin
  if new.review_outcome='accepted'
     and (old.review_outcome is distinct from 'accepted' or old.status is distinct from new.status) and
     (
       not public._playtest_public_comment_is_safe(new.feedback) or
       not public._playtest_public_comment_is_safe(new.enjoyed_most) or
       not public._playtest_public_comment_is_safe(new.frustrations) or
       not public._playtest_public_comment_is_safe(new.bugs_found) or
       not public._playtest_public_comment_is_safe(new.biggest_improvement)
     ) then
    raise exception 'Public feedback contains a link or contact detail. Move evidence to private fields and redact before approval.';
  end if;
  return new;
end;
$func$;
revoke all on function public._guard_public_test_feedback_privacy() from public,anon,authenticated;
drop trigger if exists guard_public_test_feedback_privacy on public.community_game_tests;
create trigger guard_public_test_feedback_privacy before update of review_outcome,status on public.community_game_tests
for each row execute function public._guard_public_test_feedback_privacy();

-- Atomic single RPC: an error in either the report or the private evidence rolls back both.
-- The original submit_community_game_test RPC is left intact for older clients.
create or replace function public.submit_community_game_test_with_evidence(
 p_test_id uuid, p_gameplay_score integer, p_performance_score integer,
 p_bugs_found text, p_feedback text, p_hours_played numeric,
 p_overall_score integer, p_continue_playing text, p_recommend_game text,
 p_enjoyed_most text, p_frustrations text, p_biggest_improvement text,
 p_focus_responses jsonb default '{}'::jsonb,
 p_document_url text default null, p_recording_url text default null
) returns void language plpgsql security definer set search_path=''
as $func$
declare
  v_tester uuid;
  v_status text;
  v_document text;
  v_recording text;
begin
  if auth.uid() is null then raise exception 'Sign in to submit your playtest.'; end if;
  select t.tester_id,t.status into v_tester,v_status
    from public.community_game_tests t where t.id=p_test_id for update;
  if not found or v_tester is distinct from auth.uid() or v_status not in ('claimed','in_progress') then
    raise exception 'The test is not available for submission.';
  end if;
  if not (public._playtest_public_comment_is_safe(p_feedback) and
          public._playtest_public_comment_is_safe(p_bugs_found) and
          public._playtest_public_comment_is_safe(p_enjoyed_most) and
          public._playtest_public_comment_is_safe(p_frustrations) and
          public._playtest_public_comment_is_safe(p_biggest_improvement)) then
    raise exception 'Remove links and personal contact details from public feedback. Use the private evidence fields.';
  end if;
  v_document := public._playtest_safe_evidence_url(p_document_url,'document');
  v_recording := public._playtest_safe_evidence_url(p_recording_url,'recording');
  perform public.submit_community_game_test(
    p_test_id,p_gameplay_score,p_performance_score,p_bugs_found,p_feedback,p_hours_played,
    p_overall_score,p_continue_playing,p_recommend_game,p_enjoyed_most,p_frustrations,
    p_biggest_improvement,p_focus_responses
  );
  if v_document is not null or v_recording is not null then
    insert into public.playtest_private_evidence (test_id,document_url,recording_url)
    values(p_test_id,v_document,v_recording);
  end if;
end;
$func$;
revoke all on function public.submit_community_game_test_with_evidence(uuid,integer,integer,text,text,numeric,integer,text,text,text,text,text,jsonb,text,text) from public,anon;
grant execute on function public.submit_community_game_test_with_evidence(uuid,integer,integer,text,text,numeric,integer,text,text,text,text,text,jsonb,text,text) to authenticated;

-- Tester can inspect their own report evidence, even while awaiting moderation.
create or replace function public.get_my_private_playtest_evidence(p_test_id uuid)
returns table(document_url text,recording_url text) language sql stable security definer set search_path=''
as $func$
  select e.document_url,e.recording_url from public.playtest_private_evidence e
  join public.community_game_tests t on t.id=e.test_id
  where t.id=p_test_id and auth.uid() is not null and t.tester_id=auth.uid();
$func$;
revoke all on function public.get_my_private_playtest_evidence(uuid) from public,anon;
grant execute on function public.get_my_private_playtest_evidence(uuid) to authenticated;

-- Owning developer gets private links only for their accepted reports.
create or replace function public.get_developer_private_playtest_evidence(p_playtest_id uuid)
returns table(test_id uuid,document_url text,recording_url text) language sql stable security definer set search_path=''
as $func$
  select t.id,e.document_url,e.recording_url
  from public.community_playtests c
  join public.community_game_tests t on t.playtest_id=c.id
  join public.playtest_private_evidence e on e.test_id=t.id
  where c.id=p_playtest_id and c.developer_id=auth.uid() and auth.uid() is not null
    and t.status='reviewed' and t.review_outcome='accepted' and t.replacement_at is null;
$func$;
revoke all on function public.get_developer_private_playtest_evidence(uuid) from public,anon;
grant execute on function public.get_developer_private_playtest_evidence(uuid) to authenticated;

-- Admin sees a single report's private links when moderating it.
create or replace function public.get_admin_private_playtest_evidence(p_test_id uuid)
returns table(document_url text,recording_url text) language plpgsql stable security definer set search_path=''
as $func$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then
    raise exception 'Admin access required.';
  end if;
  return query select e.document_url,e.recording_url
    from public.playtest_private_evidence e where e.test_id=p_test_id;
end;
$func$;
revoke all on function public.get_admin_private_playtest_evidence(uuid) from public,anon;
grant execute on function public.get_admin_private_playtest_evidence(uuid) to authenticated;

-- Safe audited admin repair of a pending legacy report: preserve old text privately,
-- move the evidence URL out of the public comment, and leave moderation/XP untouched.
create or replace function public.admin_relocate_playtest_private_evidence(
 p_test_id uuid,p_document_url text,p_recording_url text,p_public_feedback text,p_reason text
) returns void language plpgsql security definer set search_path=''
as $func$
declare
  v_test public.community_game_tests%rowtype;
  v_doc text;
  v_recording text;
  v_old_document text;
  v_old_recording text;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then
    raise exception 'Admin access required.';
  end if;
  if length(btrim(coalesce(p_reason,'')))<12 then raise exception 'Document the reason for evidence correction.'; end if;
  if length(coalesce(p_public_feedback,''))>10000 or
     not public._playtest_public_comment_is_safe(p_public_feedback) then
    raise exception 'The public feedback must not include a link or contact detail.';
  end if;
  select * into v_test from public.community_game_tests t where t.id=p_test_id for update;
  if not found or v_test.status<>'submitted' or v_test.review_outcome<>'pending' then
    raise exception 'Only pending submitted reports may be corrected by this action.';
  end if;
  v_doc:=public._playtest_safe_evidence_url(p_document_url,'document');
  v_recording:=public._playtest_safe_evidence_url(p_recording_url,'recording');
  if v_doc is null and v_recording is null then
    raise exception 'At least one supporting link is required.';
  end if;
  select e.document_url,e.recording_url into v_old_document,v_old_recording
  from public.playtest_private_evidence e where e.test_id=p_test_id;
  insert into public.playtest_private_evidence_audit
   (test_id,actor_id,action,previous_public_feedback,previous_document_url,previous_recording_url,reason)
  values (p_test_id,auth.uid(),'relocate',v_test.feedback,v_old_document,v_old_recording,btrim(p_reason));
  insert into public.playtest_private_evidence (test_id,document_url,recording_url)
  values(p_test_id,v_doc,v_recording)
  on conflict(test_id) do update set document_url=excluded.document_url,
    recording_url=excluded.recording_url,updated_at=now();
  update public.community_game_tests set feedback=nullif(btrim(p_public_feedback),'') where id=p_test_id;
end;
$func$;
revoke all on function public.admin_relocate_playtest_private_evidence(uuid,text,text,text,text) from public,anon;
grant execute on function public.admin_relocate_playtest_private_evidence(uuid,text,text,text,text) to authenticated;
