begin;
do $$
declare definition text; revised text;
begin
 definition:=pg_get_functiondef('public.save_game_pc_requirements(text,uuid,jsonb,jsonb)'::regprocedure);
 revised:=replace(definition,'not public._m26_controls_owner(case when p_kind=''approved'' then ''submission'' else p_kind end,p_id)',
  '(not public._m26_controls_owner(case when p_kind=''approved'' then ''submission'' else p_kind end,p_id) and playtested_studios.shared_owner(p_kind,p_id,true) is null)');
 revised:=replace(revised,'public._listing_current_claim(p_kind,p_id,auth.uid())',
  'public._listing_current_claim(p_kind,p_id,coalesce(playtested_studios.shared_owner(p_kind,p_id,true),auth.uid()))');
 if revised=definition then raise exception 'Review PC requirements authorization before applying studio support.';end if;
 execute revised;
end $$;

-- Expired invitations stay in history but no longer count or offer actions.
create or replace function public.get_my_notifications(p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required.';end if;
 return (with inbox as (
  select n.id,n.kind,
   case when expired.value then 'Studio invitation expired' else n.title end title,
   case when expired.value then 'Ask the studio owner for a new invitation.' else n.message end message,
   case when expired.value then null else n.href end href,n.entity_type,n.entity_id,
   case when expired.value then coalesce(n.read_at,i.expires_at,n.created_at) else n.read_at end read_at,n.created_at
  from public.notifications n left join playtested_studios.invites i
   on n.kind='studio_invitation' and n.recipient_id=i.user_id and n.dedupe_key='studio-invitation:'||i.id
  cross join lateral (select (n.kind='studio_invitation' and coalesce((n.href like '/my-team?invite=%' and (i.id is null or i.expires_at<=now())) or (n.href like '/my-submissions?studio=%' and not exists(select 1 from playtested_studios.members m where m.studio_id=i.studio_id and m.user_id=n.recipient_id)),false)) value) expired
  where n.recipient_id=auth.uid()
 )
 select jsonb_build_object('unread_count',(select count(*) from inbox where read_at is null),
  'notifications',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc) from
   (select * from inbox order by created_at desc,id desc limit least(greatest(coalesce(p_limit,30),1),100)) q),'[]'::jsonb)));
end $$;

-- Historical schema variants did not exclude superseded reviews.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.get_developer_accepted_playtest_feedback(uuid)'::regprocedure);
 if position('replacement_at' in definition)=0 then
  if position('cgt.review_outcome = ''accepted''' in definition)=0 then raise exception 'Review accepted-feedback filter.';end if;
  execute replace(definition,'cgt.review_outcome = ''accepted''','cgt.review_outcome = ''accepted'' and cgt.replacement_at is null');
 end if;
end $$;
-- Preserve legacy owner quality access while limiting delegated reads to accepted reports.
do $$
declare definition text; revised text;
begin
 definition:=pg_get_functiondef('public.get_developer_quality_reports(uuid)'::regprocedure);
 revised:=replace(definition,'t.status in(''submitted'',''reviewed'')',
  '(t.status in(''submitted'',''reviewed'') and exists(select 1 from public.community_playtests c where c.id=p_playtest_id and c.developer_id=auth.uid()) or (t.status=''reviewed'' and t.review_outcome=''accepted'' and t.replacement_at is null))');
 if revised=definition then raise exception 'Review developer quality report filtering.';end if;
 execute revised;
end $$;

-- The canonical game can belong to only one studio. Use the existing identity
-- resolver so an alternate listing record cannot silently duplicate ownership.
alter table playtested_studios.games add column game_key text;
create function playtested_studios.studio_game_key() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 select public._share_key(case when l.imported_game_id is not null then 'imported' when l.approved_game_id is not null then 'approved' else 'submission' end,
  coalesce(l.imported_game_id,l.approved_game_id,l.submission_id)) into new.game_key
 from public.game_developer_links l
 join playtested_studios.studios s on s.id=new.studio_id and s.owner_id=l.developer_id
 where l.id=new.link_id and (l.source_claim_id is null or exists(select 1 from public.game_claims c where c.id=l.source_claim_id and c.claimant_id=l.developer_id and c.status='Approved'));
 if new.game_key is null then raise exception 'An approved game relationship is required.' using errcode='42501';end if;
 return new;
end $$;
create trigger studio_game_key before insert or update on playtested_studios.games
for each row execute function playtested_studios.studio_game_key();
update playtested_studios.games set game_key=null;
alter table playtested_studios.games alter column game_key set not null;
alter table playtested_studios.games add constraint studio_canonical_game_unique unique(game_key);
revoke all on all functions in schema playtested_studios from public,anon,authenticated;
commit;
