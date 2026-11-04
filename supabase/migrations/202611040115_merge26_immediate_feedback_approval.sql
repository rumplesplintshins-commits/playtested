-- The existing AFTER approval trigger persists this notification in the SAME
-- transaction as moderation. No periodic approval scan or second event exists.
begin;
create or replace function public.notify_developer_feedback() returns trigger
language plpgsql security definer set search_path='' as $$
declare campaign public.community_playtests;v_owner uuid;v_title text;v_link uuid;v_href text;game_kind text;game_id uuid;k text;
begin
 if new.status is distinct from 'reviewed' or new.review_outcome is distinct from 'accepted' then return new;end if;
 if tg_op='UPDATE' and old.status='reviewed' and old.review_outcome='accepted' then return new;end if;
 if new.playtest_id is not null then
  select * into campaign from public.community_playtests where id=new.playtest_id;
  v_owner:=campaign.developer_id;
  select l.id into v_link from public.game_developer_links l where l.developer_id=v_owner and
   ((campaign.submission_id is not null and l.submission_id=campaign.submission_id)
    or(campaign.approved_game_id is not null and l.approved_game_id=campaign.approved_game_id)
    or(campaign.imported_game_id is not null and l.imported_game_id=campaign.imported_game_id)) order by l.id limit 1;
  if v_link is null and not exists(select 1 from public.game_submissions g where g.id in(campaign.submission_id,campaign.approved_game_id) and g.developer_id=v_owner) then return new;end if;
  game_id:=coalesce(campaign.submission_id,campaign.approved_game_id,campaign.imported_game_id);
  game_kind:=case when campaign.imported_game_id is not null then 'imported' else 'submission' end;
  if game_kind='imported' then select title into v_title from public.imported_games where id=game_id;
  else select title into v_title from public.game_submissions where id=game_id;end if;
  k:=public._share_key(game_kind,game_id);
  select coalesce((select published->>'title' from public.listing_states where game_key=k),v_title,campaign.title,'your game') into v_title;
  if v_link is not null then v_href:='/my-submissions?tab=games&game='||v_link;
  else v_href:='/my-submissions?tab=submissions&game='||game_id;end if;
  v_href:=v_href||'&campaign='||new.playtest_id;
 else
  select developer_id,title into v_owner,v_title from public.game_submissions where id=new.submission_id;
  v_href:='/my-submissions?tab=submissions&game='||new.submission_id;
 end if;
 if v_owner is not null and exists(select 1 from public.profiles where id=v_owner) then
  perform public._create_notification(v_owner,'developer_feedback_received','New playtest feedback approved',
   'New approved playtest feedback is available for '||left(coalesce(v_title,'your game'),100)||'. View the results in your developer workspace.',
   v_href,'playtest',coalesce(new.playtest_id,new.submission_id),'developer:feedback:'||new.id);
 end if;
 return new;
end;$$;
commit;
