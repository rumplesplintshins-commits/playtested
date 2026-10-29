begin;
do $$begin if to_regprocedure('public.get_share_context(text,uuid)')is null then raise exception 'Apply migration 011 before campaign sharing.';end if;if to_regprocedure('public._assert_developer_targeting(jsonb,jsonb)')is null then raise exception 'Apply migration 014 before campaign sharing so audience entitlements remain consistent.';end if;if to_regprocedure('public.submit_community_playtest_feedback(uuid,integer,integer,integer,integer,text,text,text,text,text,text)')is null then raise exception 'Existing community feedback RPC signature is unavailable; inspect it before applying this migration.';end if;end;$$;
alter table public.engagement_links drop constraint engagement_links_destination_check;
alter table public.engagement_links add constraint engagement_links_destination_check check(destination in('game','campaign','community'));
alter table public.engagement_events drop constraint engagement_events_kind_check;
alter table public.engagement_events add constraint engagement_events_kind_check check(kind in('visit','access','claim','submitted','community_submitted'));
alter table public.engagement_events add column community_participant_id uuid;
create unique index engagement_community_submission_once on public.engagement_events(community_participant_id) where community_participant_id is not null and kind='community_submitted';
create or replace function public._share_link_context(p_link uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare l public.engagement_links; key text; path text; cp uuid;title text;
begin
 select * into l from public.engagement_links where id=p_link;if not found then return null;end if;
 select identity_key into key from public.engagement_games where id=l.game_id;
 if public._share_key(l.kind,l.source_id) is distinct from key then return null;end if;
 if l.destination in('campaign','community') then
  if not exists(select 1 from public.community_playtests where id=l.campaign_id and status='open' and published_at is not null and ((l.destination='campaign' and audience in('both','playtested_testers'))or(l.destination='community' and audience in('both','own_community'))) and public._share_campaign_key(id)=key) then return null;end if;
  cp:=l.campaign_id;
  if exists(select 1 from public.community_playtests c where c.id=cp and (coalesce(c.release_label,c.title) is distinct from l.snapshot->>'build' or(l.snapshot?'build_key' and md5(jsonb_build_array(c.access_link,c.release_label,c.published_at)::text) is distinct from l.snapshot->>'build_key')))then return null;end if;
  if l.destination='community' then select '/playtest/'||share_token::text into path from public.community_playtests where id=cp;else path:='/tester?campaign='||cp::text;end if;
 else
  path:=public._share_public_path(key,l.kind,l.source_id);if path is null then return null;end if;
  select c.id into cp from public.community_playtests c where c.status='open' and c.audience in ('both','playtested_testers') and public._share_campaign_key(c.id)=key order by c.created_at desc limit 1;
 end if;
 if l.kind='imported' then select i.title into title from public.imported_games i where i.id=l.source_id;
 elsif l.kind='approved' then select a.title into title from public.approved_games a where a.id=l.source_id;
 else select s.title into title from public.game_submissions s where s.id=l.source_id;end if;
 return jsonb_build_object('title',title,'path',path,'tester_path',case when l.destination<>'community' and cp is not null then '/tester?campaign='||cp::text else null end,'tags',jsonb_build_object('source',l.source,'medium',l.medium,'campaign',l.campaign));
end;$$;


create or replace function public.get_share_context(p_kind text,p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare key text;begin
 key:=public._share_owned_key(p_kind,p_id);
 return jsonb_build_object('public_path',public._share_public_path(key,p_kind,p_id),'campaigns',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',coalesce(c.release_label,c.title),'audience',c.audience) order by c.created_at desc),'[]') from public.community_playtests c where c.developer_id=auth.uid() and c.status='open' and c.audience in ('both','playtested_testers','own_community') and c.published_at is not null and public._share_campaign_key(c.id)=key));
end;$$;

create or replace function public.create_share_link(p_kind text,p_id uuid,p_source text,p_label text,p_medium text,p_destination text,p_campaign uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare key text;gid uuid;existing_gid uuid;src text;medium text;campaign text;label text;build text;l public.engagement_links;
begin
 key:=public._share_owned_key(p_kind,p_id);
 if p_destination not in ('game','campaign','community') or p_destination is null then raise exception 'Select an internal destination';end if;
 if p_source is null or p_source!~'^[a-z0-9][a-z0-9_-]{0,63}$' or p_source~'[0-9]{7}' then raise exception 'Use a marketing source tag, not personal information';end if;src:=p_source;
 medium:=coalesce(nullif(p_medium,''),case when src in ('reddit','discord') then 'social' else 'referral' end);
 if medium!~'^[a-z0-9][a-z0-9_-]{0,63}$' or medium~'[0-9]{7}' then raise exception 'Invalid medium tag';end if;
 label:=btrim(coalesce(p_label,''));if length(label)>80 or label~* '@|https?:|[0-9]{7}' then raise exception 'Use a campaign label without personal information';end if;
 campaign:=left(trim(both '-' from regexp_replace(lower(label),'[^a-z0-9_-]+','-','g')),64);if campaign='' then campaign:='playtested';end if;
 if p_destination='game' then
  if p_campaign is not null or public._share_public_path(key,p_kind,p_id) is null then raise exception 'No existing public game page is available; choose an open Tester Hub campaign';end if;
 else
  select coalesce(release_label,title) into build from public.community_playtests where id=p_campaign and developer_id=auth.uid() and status='open' and published_at is not null and ((p_destination='campaign' and audience in('both','playtested_testers'))or(p_destination='community' and audience in('both','own_community'))) and public._share_campaign_key(id)=key;
  if not found then raise exception 'Select an open published campaign for this game and audience';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('share-game:'||key,0));
 insert into public.engagement_games(identity_key) values(key) on conflict(identity_key) do nothing;
 select id into gid from public.engagement_games where identity_key=key;
 insert into public.engagement_aliases(kind,source_id,game_id) values(p_kind,p_id,gid) on conflict do nothing;
 select game_id into existing_gid from public.engagement_aliases where kind=p_kind and source_id=p_id;
 if existing_gid<>gid then raise exception 'Game identity needs reconciliation';end if;
 insert into public.engagement_links(game_id,owner_id,kind,source_id,campaign_id,source,medium,campaign,label,destination,snapshot)
 values(gid,auth.uid(),p_kind,p_id,p_campaign,src,medium,campaign,label,p_destination,jsonb_build_object('source',src,'medium',medium,'campaign',campaign,'label',label,'destination',p_destination,'build',build,'campaign_id',p_campaign,'audience',(select audience from public.community_playtests where id=p_campaign),'build_key',(select md5(jsonb_build_array(access_link,release_label,published_at)::text) from public.community_playtests where id=p_campaign))) returning * into l;
 return jsonb_build_object('id',l.id,'source',src,'medium',medium,'campaign',campaign,'label',label,'destination',p_destination,'build',build);
end;$$;


create or replace function public.record_share_access(p_token text,p_path text,p_campaign uuid,p_rate text,p_actor uuid default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare v public.engagement_visits;l public.engagement_links;key text;n integer;
begin
 perform public._share_prune();
 select * into v from public.engagement_visits where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and expires_at>clock_timestamp() and created_at>clock_timestamp()-interval '30 days';if not found then return false;end if;
 select * into l from public.engagement_links where id=v.link_id;select identity_key into key from public.engagement_games where id=l.game_id;
 if p_campaign is not null then
  if public._share_campaign_key(p_campaign) is distinct from key or (l.campaign_id is not null and l.campaign_id<>p_campaign) then return false;end if;
  if l.destination='community' then
   if public._share_link_context(l.id) is null or p_path is distinct from split_part(public._share_link_context(l.id)->>'path','?',1) or not exists(select 1 from public.community_playtest_participants where playtest_id=p_campaign and tester_id=p_actor)then return false;end if;
  elsif not public.campaign_eligible(p_campaign,p_actor) and not exists(select 1 from public.community_game_tests where playtest_id=p_campaign and tester_id=p_actor and status in ('claimed','in_progress')) then return false;end if;
 elsif l.destination<>'game' or p_path is distinct from split_part(public._share_link_context(l.id)->>'path','?',1) then return false;end if;
 if p_actor=l.owner_id then return false;end if;
 perform public._share_rate(p_rate);
 insert into public.engagement_dedup values(p_rate,l.id,to_timestamp(floor(extract(epoch from clock_timestamp())/900)*900),'access') on conflict do nothing;get diagnostics n=row_count;
 if n=0 then return false;end if;
 insert into public.engagement_events(link_id,visit_id,kind,snapshot) values(l.id,v.id,'access',v.snapshot) on conflict do nothing;return true;
end;$$;


create or replace function public._share_conversion() returns trigger language plpgsql security definer set search_path='' as $$
declare token text;v public.engagement_visits;l public.engagement_links;key text;a public.engagement_claims;
begin
 if TG_OP='INSERT' then
  token:=current_setting('playtested.share_visit',true);if token is null or token='' or NEW.playtest_id is null then return NEW;end if;
  select * into v from public.engagement_visits where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and expires_at>clock_timestamp() and created_at>clock_timestamp()-interval '30 days';if not found then return NEW;end if;
  select * into l from public.engagement_links where id=v.link_id;select identity_key into key from public.engagement_games where id=l.game_id;
  if l.destination='community' or public._share_link_context(l.id) is null or public._share_campaign_key(NEW.playtest_id) is distinct from key or (l.campaign_id is not null and l.campaign_id<>NEW.playtest_id) or NEW.tester_id=l.owner_id then return NEW;end if;
  insert into public.engagement_claims(claim_id,link_id,snapshot) values(NEW.id,l.id,v.snapshot) on conflict do nothing;
  insert into public.engagement_events(link_id,claim_id,kind,snapshot,created_at) values(l.id,NEW.id,'claim',v.snapshot,NEW.claimed_at) on conflict do nothing;
 elsif NEW.status='submitted' and OLD.status not in ('submitted','reviewed') then
  select * into a from public.engagement_claims where claim_id=NEW.id;if not found then return NEW;end if;
  insert into public.engagement_events(link_id,claim_id,kind,snapshot,created_at) values(a.link_id,NEW.id,'submitted',a.snapshot,coalesce(NEW.submitted_at,clock_timestamp())) on conflict do nothing;
 end if;
 return NEW;
 exception when others then return NEW; -- Analytics must never block the underlying test action.
end;$$;

create or replace function public.get_share_engagement(p_kind text,p_id uuid,p_from date,p_to date) returns jsonb
language plpgsql security definer set search_path='' as $$declare key text;gid uuid;begin
 key:=public._share_owned_key(p_kind,p_id);
 if p_from is null or p_to is null or p_from>p_to or p_from<(current_timestamp at time zone 'UTC')::date-89 or p_to>(current_timestamp at time zone 'UTC')::date then raise exception 'Choose dates within the last 90 UTC calendar days';end if;
 perform public._share_prune();select id into gid from public.engagement_games where identity_key=key;
 return jsonb_build_object('links',(select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'source',l.source,'medium',l.medium,'campaign',l.campaign,'label',l.label,'destination',l.destination,'build',l.snapshot->>'build','campaign_id',l.campaign_id,'audience',l.snapshot->>'audience','available',public._share_link_context(l.id) is not null) order by l.created_at desc),'[]') from public.engagement_links l where l.game_id=gid and l.owner_id=auth.uid()),
 'breakdown',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select l.id link_id,coalesce(e.snapshot,l.snapshot) snapshot,l.campaign_id,l.destination,count(*) filter(where e.kind='visit') visits,count(*) filter(where e.kind='access') access_clicks,count(*) filter(where e.kind='claim') claims,count(*) filter(where e.kind='submitted') submissions,count(*) filter(where e.kind='community_submitted') community_submissions from public.engagement_links l left join public.engagement_events e on l.id=e.link_id and e.created_at>=p_from::timestamp at time zone 'UTC' and e.created_at<(p_to+1)::timestamp at time zone 'UTC' where l.game_id=gid and l.owner_id=auth.uid() group by l.id,coalesce(e.snapshot,l.snapshot),l.campaign_id,l.destination)r));
end;$$;


create function public.submit_community_feedback_with_attribution(p_participant_id uuid,p_overall_score integer,p_gameplay_score integer,p_controls_score integer,p_performance_score integer,p_enjoyed text,p_struggled text,p_improvements text,p_bugs text,p_recommendation text,p_additional_comments text,p_visit text default null)returns void language plpgsql security definer set search_path='' as $$declare participant public.community_playtest_participants;v public.engagement_visits;l public.engagement_links;begin
 -- Existing validation, participation, duplicate and moderation rules remain authoritative.
 perform public.submit_community_playtest_feedback(p_participant_id,p_overall_score,p_gameplay_score,p_controls_score,p_performance_score,p_enjoyed,p_struggled,p_improvements,p_bugs,p_recommendation,p_additional_comments);
 begin
  select * into participant from public.community_playtest_participants where id=p_participant_id and tester_id=auth.uid();if not found then return;end if;
  select * into v from public.engagement_visits where token_hash=encode(sha256(convert_to(p_visit,'UTF8')),'hex') and expires_at>clock_timestamp() and created_at>clock_timestamp()-interval '30 days';if not found then return;end if;
  select * into l from public.engagement_links where id=v.link_id;
  if l.destination<>'community' or l.campaign_id<>participant.playtest_id or participant.tester_id=l.owner_id or public._share_link_context(l.id)is null then return;end if;
  insert into public.engagement_events(link_id,kind,snapshot,community_participant_id)values(l.id,'community_submitted',v.snapshot,participant.id)on conflict do nothing;
 exception when others then null; -- Attribution never rolls back successful feedback.
 end;
end;$$;
revoke all on function public.submit_community_feedback_with_attribution(uuid,integer,integer,integer,integer,text,text,text,text,text,text,text)from public,anon,authenticated;
grant execute on function public.submit_community_feedback_with_attribution(uuid,integer,integer,integer,integer,text,text,text,text,text,text,text)to authenticated;
-- Community-only settings are retained but do not require Hub targeting entitlements.
do $$declare source text;begin if to_regprocedure('public._assert_developer_targeting(jsonb,jsonb)')is not null then source:=pg_get_functiondef('public._assert_developer_targeting(jsonb,jsonb)'::regprocedure);source:=replace(source,'if p_new->>''status''=''closed'' then return;end if;','if p_new->>''status''=''closed'' or p_new->>''audience''=''own_community'' then return;end if;');source:=replace(source,'published:=p_old is not null and nullif(p_old->>''published_at'','''') is not null;','published:=p_old is not null and nullif(p_old->>''published_at'','''') is not null and nullif(p_old->>''tester_hub_started_at'','''') is not null;');execute source;end if;end;$$;
notify pgrst,'reload schema';
commit;
