begin;
-- B: Campaign completion lifecycle.
-- A campaign completes only when the number of admin-approved, accepted playtest
-- reports reaches its target, using the established definition elsewhere in the
-- platform: review_outcome='accepted' AND replacement_at IS NULL. Claims,
-- reservations and unreviewed feedback never complete a campaign; rejected
-- feedback never counts; pending feedback simply does not yet count until
-- an admin decides it. When the target is reached the round closes itself
-- exactly once and the developer receives one notification.

alter table public.community_playtests add column if not exists completed_at timestamptz;

-- New notification kinds: developer completion alert and admin moderation alerts.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in (
 'admin_new_submission','submission_needs_info','submission_approved','submission_rejected',
 'tester_playtest_available','tester_feedback_useful','developer_feedback_received',
 'campaign_completed','admin_feedback_moderation'));

-- Security-definer writer recognises the two new kinds (extended 040013 body).
create or replace function public._create_notification(
  p_recipient uuid,
  p_kind text,
  p_title text,
  p_message text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedupe_key text default null
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_reserved uuid;
begin
  if p_recipient is null or not exists(select 1 from public.profiles where id=p_recipient) then
    raise exception 'Notification recipient is unavailable.';
  end if;

  if p_kind is null or p_kind not in (
    'admin_new_submission',
    'submission_needs_info',
    'submission_approved',
    'tester_playtest_available',
    'tester_feedback_useful',
    'submission_rejected',
    'developer_feedback_received',
    'campaign_completed',
    'admin_feedback_moderation'
  ) then
    raise exception 'Unsupported notification type.';
  end if;

  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title)) > 120 then
    raise exception 'Notification title is invalid.';
  end if;

  if nullif(btrim(p_message),'') is null or char_length(btrim(p_message)) > 500 then
    raise exception 'Notification message is invalid.';
  end if;

  if p_href is not null and (left(p_href,1) <> '/' or left(p_href,2) = '//') then
    raise exception 'Notification destination must be an internal path.';
  end if;

  if (p_entity_type is null) <> (p_entity_id is null) then
    raise exception 'Notification entity reference is incomplete.';
  end if;

  if p_entity_type is not null and p_entity_type not in ('submission','playtest','game') then
    raise exception 'Unsupported notification entity type.';
  end if;

  if p_dedupe_key is not null then
    insert into public.notification_delivery_keys(recipient_id,dedupe_key) values(p_recipient,p_dedupe_key)
    on conflict do nothing returning recipient_id into v_reserved;
    if v_reserved is null then
      return (select id from public.notifications where recipient_id=p_recipient and dedupe_key=p_dedupe_key);
    end if;
  end if;
  insert into public.notifications(
    recipient_id,kind,title,message,href,entity_type,entity_id,dedupe_key
  ) values (
    p_recipient,p_kind,btrim(p_title),btrim(p_message),p_href,p_entity_type,p_entity_id,p_dedupe_key
  )
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null
  do nothing
  returning id into v_id;

  if v_id is null and p_dedupe_key is not null then
    select id into v_id
    from public.notifications
    where recipient_id=p_recipient and dedupe_key=p_dedupe_key;
  end if;

  return v_id;
end;
$$;

revoke all on function public._create_notification(uuid,text,text,text,text,text,uuid,text)
from public, anon, authenticated;

-- Surface accepted/target progress alongside the existing places read model.
create or replace function public.get_campaign_testing_details(p_id uuid) returns jsonb
language sql volatile security definer set search_path='' as $$
select jsonb_build_object('minimum_rank',c.minimum_rank,'testing_genre',c.testing_genre,'genre_restricted',c.genre_restricted,'build_locked',exists(select 1 from public.campaign_build_locks where playtest_id=c.id),'capacity',c.target_testers,'accepted',(select count(*)::int from public.community_game_tests tt where tt.playtest_id=c.id and tt.replacement_at is null and tt.status='reviewed' and tt.review_outcome='accepted'),'completed_at',c.completed_at,'submitted',p.submitted,'testing',p.testing,'available',p.available,'server_now',clock_timestamp(),'reservation_hours',extract(epoch from (select reservation_window from public.testing_policy))/3600)
from public.community_playtests c cross join lateral public.campaign_places(c.id)p
where c.id=p_id and (c.developer_id=auth.uid() or(c.status='open' and c.audience in('both','playtested_testers') and public.campaign_eligible(c.id,auth.uid())) or exists(select 1 from public.community_game_tests where playtest_id=c.id and tester_id=auth.uid()));$$;

-- Shared My Games destination for campaign notifications.
create function public._campaign_my_games_href(p_campaign_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare campaign public.community_playtests%rowtype;v_link uuid;v_href text;
begin
 select * into campaign from public.community_playtests where id=p_campaign_id;
 if not found then return '/my-submissions?tab=games'; end if;
 select l.id into v_link from public.game_developer_links l where l.developer_id=campaign.developer_id and
  ((campaign.submission_id is not null and l.submission_id=campaign.submission_id)
   or(campaign.approved_game_id is not null and l.approved_game_id=campaign.approved_game_id)
   or(campaign.imported_game_id is not null and l.imported_game_id=campaign.imported_game_id)) order by l.id limit 1;
 if v_link is not null then
  v_href:='/my-submissions?tab=games&game='||v_link::text;
 elsif campaign.submission_id is not null then
  v_href:='/my-submissions?tab=submissions&game='||campaign.submission_id::text;
 else
  v_href:='/my-submissions?tab=games';
 end if;
 return v_href||'&campaign='||campaign.id::text;
end;$$;

-- Completion transitions are idempotent and concurrency-safe: the existing
-- campaign capacity advisory lock serialises lifecycle touches, the campaign row
-- is locked FOR UPDATE, completed_at makes the transition once-only, and the
-- notification delivery key guarantees exactly one developer alert even if the
-- developer dismisses it.
create function public.process_campaign_completion() returns trigger
language plpgsql security definer set search_path='' as $$
declare campaign public.community_playtests%rowtype;accepted integer;v_href text;v_title text;game_id uuid;game_kind text;
begin
 if new.playtest_id is null then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('playtested:capacity:'||new.playtest_id::text,0));
 select * into campaign from public.community_playtests where id=new.playtest_id for update;
 if not found or campaign.completed_at is not null or campaign.status not in('open','paused') then return new; end if;
 select count(*)::int into accepted from public.community_game_tests t
  where t.playtest_id=campaign.id and t.replacement_at is null and t.status='reviewed' and t.review_outcome='accepted';
 if coalesce(campaign.target_testers,0)<=0 or accepted < campaign.target_testers then return new; end if;
 update public.community_playtests set status='closed',completed_at=clock_timestamp() where id=campaign.id;
 game_id:=coalesce(campaign.submission_id,campaign.approved_game_id,campaign.imported_game_id);
 game_kind:=case when campaign.imported_game_id is not null then 'imported' else 'submission' end;
 if game_kind='imported' then select title into v_title from public.imported_games where id=game_id;
 else select title into v_title from public.game_submissions where id=game_id;end if;
 v_title:=left(coalesce((select published->>'title' from public.listing_states where game_key=public._share_key(game_kind,game_id)),v_title,campaign.title,'your game'),100);
 v_href:=public._campaign_my_games_href(campaign.id);
 perform public._create_notification(campaign.developer_id,'campaign_completed','Playtest target reached',
  v_title||' has reached its accepted-playtest target ('||coalesce(campaign.target_testers,0)||'). The round is complete.',
  v_href,'playtest',campaign.id,'campaign:completed:'||campaign.id::text);
 return new;
end;$$;
create trigger aa_campaign_completion
after insert or update on public.community_game_tests
for each row execute function public.process_campaign_completion();

-- Admin alert when submitted feedback first requires moderation. One alert per
-- test per admin; retries never duplicate. Pending feedback after completion
-- still needs moderation, so alerts are not suppressed on completed rounds.
create function public.notify_feedback_moderation() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_admin uuid;v_title text;
begin
 if new.status<>'submitted' then return new; end if;
 if new.playtest_id is not null then
  select title into v_title from public.community_playtests where id=new.playtest_id;
 else
  select title into v_title from public.game_submissions where id=new.submission_id;
 end if;
 for v_admin in select id from public.profiles where role='admin' loop
  perform public._create_notification(v_admin,'admin_feedback_moderation','Feedback awaiting moderation',
   left(coalesce(v_title,'A campaign'),100)||' has new tester feedback awaiting quality review.',
   '/admin/submissions',
   case when new.playtest_id is not null then 'playtest' end,
   new.playtest_id,
   'feedback:moderation:'||new.id::text||':admin:'||v_admin::text);
 end loop;
 return new;
end;$$;
create trigger aa_feedback_moderation
after insert or update on public.community_game_tests
for each row execute function public.notify_feedback_moderation();

-- Reopened moderation questions also alert admins, once per reconsideration event.
create function public.notify_feedback_reconsideration() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_admin uuid;v_playtest_id uuid;
begin
 if new.kind<>'reconsideration' then return new; end if;
 select playtest_id into v_playtest_id from public.community_game_tests where id=new.test_id;
 for v_admin in select id from public.profiles where role='admin' loop
  perform public._create_notification(v_admin,'admin_feedback_moderation','Reconsideration requested',
   'A tester has asked for a second look at earlier feedback moderation.',
   '/admin/submissions',
   case when v_playtest_id is not null then 'playtest' end,
   v_playtest_id,
   'feedback:moderation:'||new.test_id::text||':recon:'||new.id::text||':admin:'||v_admin::text);
 end loop;
 return new;
end;$$;
create trigger aa_feedback_reconsideration
after insert on public.test_review_events
for each row execute function public.notify_feedback_reconsideration();

revoke all on function public.process_campaign_completion(),public.notify_feedback_moderation(),public.notify_feedback_reconsideration(),public._campaign_my_games_href(uuid),public.get_campaign_testing_details(uuid)
from public,anon;
notify pgrst,'reload schema';
commit;
