begin;
-- First-party, current-journey attribution only. No browser analytics storage.
create table public.engagement_games(id uuid primary key default gen_random_uuid(),identity_key text unique not null);
create table public.engagement_aliases(kind text not null,source_id uuid not null,game_id uuid not null references public.engagement_games,primary key(kind,source_id));
create table public.engagement_links(id uuid primary key default gen_random_uuid(),game_id uuid not null references public.engagement_games,owner_id uuid not null,kind text not null,source_id uuid not null,campaign_id uuid,source text not null,medium text not null,campaign text not null,label text not null,destination text not null check(destination in ('game','campaign')),snapshot jsonb not null,created_at timestamptz not null default clock_timestamp());
create table public.engagement_visits(id uuid primary key default gen_random_uuid(),link_id uuid not null references public.engagement_links,token_hash text unique not null,snapshot jsonb not null,created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null);
create table public.engagement_events(id bigint generated always as identity primary key,link_id uuid not null references public.engagement_links,visit_id uuid,claim_id uuid,kind text not null check(kind in ('visit','access','claim','submitted')),snapshot jsonb not null,created_at timestamptz not null default clock_timestamp(),unique(kind,claim_id),unique(kind,visit_id));
-- Bind to the authoritative claim ID; retain bindings while that claim exists.
-- No FK: releasing an unsubmitted claim must not erase a successful-claim event.
create table public.engagement_claims(claim_id uuid primary key,link_id uuid not null references public.engagement_links,snapshot jsonb not null,created_at timestamptz not null default clock_timestamp());
create table public.engagement_limits(rate_key text not null,hour timestamptz not null,requests integer not null,primary key(rate_key,hour));
create table public.engagement_dedup(rate_key text not null,link_id uuid not null,slot timestamptz not null,kind text not null,primary key(rate_key,link_id,slot,kind));
create index engagement_events_report on public.engagement_events(link_id,created_at);
do $$declare t text;begin foreach t in array array['engagement_games','engagement_aliases','engagement_links','engagement_visits','engagement_events','engagement_claims','engagement_limits','engagement_dedup'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);end loop;end$$;

create function public._share_key(p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare steam text; other_steam text; present boolean;
begin
 if p_kind='imported' then select steam_app_id,true into steam,present from public.imported_games where id=p_id;
 elsif p_kind='submission' then select steam_app_id,true into steam,present from public.game_submissions where id=p_id;select steam_app_id into other_steam from public.approved_games where id=p_id;
 elsif p_kind='approved' then select steam_app_id,true into steam,present from public.approved_games where id=p_id;select steam_app_id into other_steam from public.game_submissions where id=p_id;
 else raise exception 'Invalid game source';end if;
 if not coalesce(present,false) then return null;end if;
 if steam~'^[0-9]+$' and other_steam~'^[0-9]+$' and steam<>other_steam then raise exception 'Ambiguous game identity requires review';end if;
 steam:=coalesce(nullif(steam,''),other_steam);
 return case when steam~'^[0-9]+$' then 'steam:'||steam else case when p_kind='imported' then 'imported:' else 'game:' end||p_id::text end;
end;$$;
create function public._share_owned_key(p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare key text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and 'developer'=any(roles))
 or not exists(select 1 from public.game_developer_links where developer_id=auth.uid() and ((p_kind='imported' and imported_game_id=p_id) or(p_kind='approved' and approved_game_id=p_id)or(p_kind='submission' and submission_id=p_id))) then raise exception 'Developer access unavailable';end if;
 key:=public._share_key(p_kind,p_id);if key is null then raise exception 'Game unavailable';end if;
 if exists(select 1 from public.engagement_aliases a join public.engagement_games g on g.id=a.game_id where a.kind=p_kind and a.source_id=p_id and g.identity_key<>key) then raise exception 'Game identity changed; tracking needs reconciliation';end if;
 return key;
end;$$;
create function public._share_campaign_key(p_id uuid) returns text language sql stable security definer set search_path='' as $$
 select public._share_key(case when imported_game_id is not null then 'imported' when approved_game_id is not null then 'approved' else 'submission' end,coalesce(imported_game_id,approved_game_id,submission_id)) from public.community_playtests where id=p_id;
$$;
create function public._share_public_path(p_key text,p_kind text,p_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$declare id uuid;begin
 if p_key like 'steam:%' then
  if exists(select 1 from public.imported_games where steam_app_id=substr(p_key,7) and catalogue_eligible and coalesce(catalogue_review_status,'eligible')='eligible' and not is_nsfw) then return '/games/steam-'||substr(p_key,7);end if;
  select a.id into id from public.approved_games a where a.steam_app_id=substr(p_key,7) order by a.id limit 1;
 else select a.id into id from public.approved_games a where a.id=p_id;end if;
 if id is not null then return '/submissions/'||id::text;end if;return null;
end;$$;
create function public._share_link_context(p_link uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare l public.engagement_links; key text; path text; cp uuid;title text;
begin
 select * into l from public.engagement_links where id=p_link;if not found then return null;end if;
 select identity_key into key from public.engagement_games where id=l.game_id;
 if public._share_key(l.kind,l.source_id) is distinct from key then return null;end if;
 if l.destination='campaign' then
  if not exists(select 1 from public.community_playtests where id=l.campaign_id and status='open' and audience in ('both','playtested_testers') and public._share_campaign_key(id)=key) then return null;end if;
  cp:=l.campaign_id;path:='/tester?campaign='||cp::text;
 else
  path:=public._share_public_path(key,l.kind,l.source_id);if path is null then return null;end if;
  select c.id into cp from public.community_playtests c where c.status='open' and c.audience in ('both','playtested_testers') and public._share_campaign_key(c.id)=key order by c.created_at desc limit 1;
 end if;
 if l.kind='imported' then select i.title into title from public.imported_games i where i.id=l.source_id;
 elsif l.kind='approved' then select a.title into title from public.approved_games a where a.id=l.source_id;
 else select s.title into title from public.game_submissions s where s.id=l.source_id;end if;
 return jsonb_build_object('title',title,'path',path,'tester_path',case when cp is not null then '/tester?campaign='||cp::text else null end,'tags',jsonb_build_object('source',l.source,'medium',l.medium,'campaign',l.campaign));
end;$$;

create function public.get_share_context(p_kind text,p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare key text;begin
 key:=public._share_owned_key(p_kind,p_id);
 return jsonb_build_object('public_path',public._share_public_path(key,p_kind,p_id),'campaigns',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'label',coalesce(c.release_label,c.title)) order by c.created_at desc),'[]') from public.community_playtests c where c.developer_id=auth.uid() and c.status='open' and c.audience in ('both','playtested_testers') and public._share_campaign_key(c.id)=key));
end;$$;
create function public.create_share_link(p_kind text,p_id uuid,p_source text,p_label text,p_medium text,p_destination text,p_campaign uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare key text;gid uuid;existing_gid uuid;src text;medium text;campaign text;label text;build text;l public.engagement_links;
begin
 key:=public._share_owned_key(p_kind,p_id);
 if p_destination not in ('game','campaign') or p_destination is null then raise exception 'Select an internal destination';end if;
 if p_source is null or p_source!~'^[a-z0-9][a-z0-9_-]{0,63}$' or p_source~'[0-9]{7}' then raise exception 'Use a marketing source tag, not personal information';end if;src:=p_source;
 medium:=coalesce(nullif(p_medium,''),case when src in ('reddit','discord') then 'social' else 'referral' end);
 if medium!~'^[a-z0-9][a-z0-9_-]{0,63}$' or medium~'[0-9]{7}' then raise exception 'Invalid medium tag';end if;
 label:=btrim(coalesce(p_label,''));if length(label)>80 or label~* '@|https?:|[0-9]{7}' then raise exception 'Use a campaign label without personal information';end if;
 campaign:=left(trim(both '-' from regexp_replace(lower(label),'[^a-z0-9_-]+','-','g')),64);if campaign='' then campaign:='playtested';end if;
 if p_destination='game' then
  if p_campaign is not null or public._share_public_path(key,p_kind,p_id) is null then raise exception 'No existing public game page is available; choose an open Tester Hub campaign';end if;
 else
  select coalesce(release_label,title) into build from public.community_playtests where id=p_campaign and developer_id=auth.uid() and status='open' and audience in ('both','playtested_testers') and public._share_campaign_key(id)=key;
  if not found then raise exception 'Select an open Tester Hub campaign for this game';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('share-game:'||key,0));
 insert into public.engagement_games(identity_key) values(key) on conflict(identity_key) do nothing;
 select id into gid from public.engagement_games where identity_key=key;
 insert into public.engagement_aliases(kind,source_id,game_id) values(p_kind,p_id,gid) on conflict do nothing;
 select game_id into existing_gid from public.engagement_aliases where kind=p_kind and source_id=p_id;
 if existing_gid<>gid then raise exception 'Game identity needs reconciliation';end if;
 insert into public.engagement_links(game_id,owner_id,kind,source_id,campaign_id,source,medium,campaign,label,destination,snapshot)
 values(gid,auth.uid(),p_kind,p_id,p_campaign,src,medium,campaign,label,p_destination,jsonb_build_object('source',src,'medium',medium,'campaign',campaign,'label',label,'destination',p_destination,'build',build)) returning * into l;
 return jsonb_build_object('id',l.id,'source',src,'medium',medium,'campaign',campaign,'label',label,'destination',p_destination,'build',build);
end;$$;

create function public._share_prune() returns void language plpgsql security definer set search_path='' as $$begin
 delete from public.engagement_events where created_at<clock_timestamp()-interval '90 days';
 delete from public.engagement_visits where created_at<clock_timestamp()-interval '90 days';
 delete from public.engagement_claims a where a.created_at<clock_timestamp()-interval '90 days' and not exists(select 1 from public.community_game_tests t where t.id=a.claim_id and (t.status in ('claimed','in_progress') or t.submitted_at>clock_timestamp()-interval '90 days'));
 delete from public.engagement_limits where hour<clock_timestamp()-interval '24 hours';
 delete from public.engagement_dedup where slot<clock_timestamp()-interval '24 hours';
end;$$;
create function public._share_rate(p_rate text) returns void language plpgsql security definer set search_path='' as $$declare n integer;begin
 if p_rate!~'^[a-f0-9]{64}$' or p_rate is null then raise exception 'Invalid rate key';end if;
 insert into public.engagement_limits values(p_rate,date_trunc('hour',clock_timestamp()),1) on conflict(rate_key,hour) do update set requests=public.engagement_limits.requests+1 returning requests into n;
 if n>60 then raise exception 'Share event rate limit reached';end if;
end;$$;
create function public.record_share_visit(p_link uuid,p_rate text,p_actor uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare context jsonb;l public.engagement_links;v public.engagement_visits;token text;inserted integer;
begin
 perform public._share_prune();context:=public._share_link_context(p_link);if context is null then return null;end if;
 select * into l from public.engagement_links where id=p_link;
 if p_actor is not null and exists(select 1 from public.game_developer_links d join public.engagement_games g on g.id=l.game_id where d.developer_id=p_actor and public._share_key(case when d.imported_game_id is not null then 'imported' when d.approved_game_id is not null then 'approved' else 'submission' end,coalesce(d.imported_game_id,d.approved_game_id,d.submission_id))=g.identity_key) then return context||jsonb_build_object('token',null,'preview',true);end if;
 perform public._share_rate(p_rate);
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.engagement_visits(link_id,token_hash,snapshot,expires_at) values(l.id,encode(sha256(convert_to(token,'UTF8')),'hex'),l.snapshot,clock_timestamp()+interval '30 minutes') returning * into v;
 insert into public.engagement_dedup values(p_rate,l.id,to_timestamp(floor(extract(epoch from clock_timestamp())/900)*900),'visit') on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=1 then insert into public.engagement_events(link_id,visit_id,kind,snapshot) values(l.id,v.id,'visit',v.snapshot);end if;
 return context||jsonb_build_object('token',token,'preview',false);
end;$$;
create function public.share_journey_context(p_token text,p_path text) returns jsonb
language sql stable security definer set search_path='' as $$
 select public._share_link_context(l.id) from public.engagement_visits v join public.engagement_links l on l.id=v.link_id
 where v.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and v.expires_at>clock_timestamp() and v.created_at>clock_timestamp()-interval '30 days'
 and (p_path='/tester' or p_path=split_part(public._share_link_context(l.id)->>'path','?',1));
$$;
create function public.record_share_access(p_token text,p_path text,p_campaign uuid,p_rate text,p_actor uuid default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare v public.engagement_visits;l public.engagement_links;key text;n integer;
begin
 perform public._share_prune();
 select * into v from public.engagement_visits where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and expires_at>clock_timestamp() and created_at>clock_timestamp()-interval '30 days';if not found then return false;end if;
 select * into l from public.engagement_links where id=v.link_id;select identity_key into key from public.engagement_games where id=l.game_id;
 if p_campaign is not null then
  if public._share_campaign_key(p_campaign) is distinct from key or (l.campaign_id is not null and l.campaign_id<>p_campaign) then return false;end if;
  if not public.campaign_eligible(p_campaign,p_actor) and not exists(select 1 from public.community_game_tests where playtest_id=p_campaign and tester_id=p_actor and status in ('claimed','in_progress')) then return false;end if;
 elsif l.destination<>'game' or p_path is distinct from split_part(public._share_link_context(l.id)->>'path','?',1) then return false;end if;
 if p_actor=l.owner_id then return false;end if;
 perform public._share_rate(p_rate);
 insert into public.engagement_dedup values(p_rate,l.id,to_timestamp(floor(extract(epoch from clock_timestamp())/900)*900),'access') on conflict do nothing;get diagnostics n=row_count;
 if n=0 then return false;end if;
 insert into public.engagement_events(link_id,visit_id,kind,snapshot) values(l.id,v.id,'access',v.snapshot) on conflict do nothing;return true;
end;$$;

create function public.claim_with_share_attribution(p_submission_id uuid,p_visit text) returns uuid
language plpgsql security definer set search_path='' as $$declare result uuid;begin
 perform set_config('playtested.share_visit',coalesce(p_visit,''),true);
 result:=public.claim_community_game_test(p_submission_id);
 perform set_config('playtested.share_visit','',true);
 return result;
end;$$;
create function public._share_conversion() returns trigger language plpgsql security definer set search_path='' as $$
declare token text;v public.engagement_visits;l public.engagement_links;key text;a public.engagement_claims;
begin
 if TG_OP='INSERT' then
  token:=current_setting('playtested.share_visit',true);if token is null or token='' or NEW.playtest_id is null then return NEW;end if;
  select * into v from public.engagement_visits where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and expires_at>clock_timestamp() and created_at>clock_timestamp()-interval '30 days';if not found then return NEW;end if;
  select * into l from public.engagement_links where id=v.link_id;select identity_key into key from public.engagement_games where id=l.game_id;
  if public._share_campaign_key(NEW.playtest_id) is distinct from key or (l.campaign_id is not null and l.campaign_id<>NEW.playtest_id) or NEW.tester_id=l.owner_id then return NEW;end if;
  insert into public.engagement_claims(claim_id,link_id,snapshot) values(NEW.id,l.id,v.snapshot) on conflict do nothing;
  insert into public.engagement_events(link_id,claim_id,kind,snapshot,created_at) values(l.id,NEW.id,'claim',v.snapshot,NEW.claimed_at) on conflict do nothing;
 elsif NEW.status='submitted' and OLD.status not in ('submitted','reviewed') then
  select * into a from public.engagement_claims where claim_id=NEW.id;if not found then return NEW;end if;
  insert into public.engagement_events(link_id,claim_id,kind,snapshot,created_at) values(a.link_id,NEW.id,'submitted',a.snapshot,coalesce(NEW.submitted_at,clock_timestamp())) on conflict do nothing;
 end if;
 return NEW;
 exception when others then return NEW; -- Analytics must never block the underlying test action.
end;$$;
create trigger share_claim_event after insert on public.community_game_tests for each row execute function public._share_conversion();
create trigger share_submission_event after update of status on public.community_game_tests for each row execute function public._share_conversion();

create function public.get_share_engagement(p_kind text,p_id uuid,p_from date,p_to date) returns jsonb
language plpgsql security definer set search_path='' as $$declare key text;gid uuid;begin
 key:=public._share_owned_key(p_kind,p_id);
 if p_from is null or p_to is null or p_from>p_to or p_from<(current_timestamp at time zone 'UTC')::date-89 or p_to>(current_timestamp at time zone 'UTC')::date then raise exception 'Choose dates within the last 90 UTC calendar days';end if;
 perform public._share_prune();select id into gid from public.engagement_games where identity_key=key;
 return jsonb_build_object('links',(select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'source',l.source,'medium',l.medium,'campaign',l.campaign,'label',l.label,'destination',l.destination,'build',l.snapshot->>'build','available',public._share_link_context(l.id) is not null) order by l.created_at desc),'[]') from public.engagement_links l where l.game_id=gid and l.owner_id=auth.uid()),
 'breakdown',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select e.link_id,e.snapshot,count(*) filter(where e.kind='visit') visits,count(*) filter(where e.kind='access') access_clicks,count(*) filter(where e.kind='claim') claims,count(*) filter(where e.kind='submitted') submissions from public.engagement_events e join public.engagement_links l on l.id=e.link_id where l.game_id=gid and l.owner_id=auth.uid() and e.created_at>=p_from::timestamp at time zone 'UTC' and e.created_at<(p_to+1)::timestamp at time zone 'UTC' group by e.link_id,e.snapshot)r));
end;$$;

-- All raw tables and internal helpers are private; public event writes use server credentials.
do $$declare p regprocedure;begin for p in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and (proname like '\_share\_%' escape '\' or proname in ('get_share_context','create_share_link','record_share_visit','share_journey_context','record_share_access','claim_with_share_attribution','get_share_engagement')) loop execute format('revoke all on function %s from public,anon,authenticated',p);end loop;end$$;
grant execute on function public.get_share_context(text,uuid),public.create_share_link(text,uuid,text,text,text,text,uuid),public.get_share_engagement(text,uuid,date,date),public.claim_with_share_attribution(uuid,text) to authenticated;
grant execute on function public._share_link_context(uuid),public.record_share_visit(uuid,text,uuid),public.share_journey_context(text,text),public.record_share_access(text,text,uuid,text,uuid) to service_role;
notify pgrst,'reload schema';
commit;
