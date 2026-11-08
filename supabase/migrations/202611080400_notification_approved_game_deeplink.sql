-- Route submission_approved notifications to the specific game in My Games so
-- Start Playtest is prominently visible when the developer opens the alert.
-- Forward-only: CREATE OR REPLACE only; no data is modified.
-- Depends on 202611040013_notification_routing.sql (defines notify_submission_lifecycle
-- and the game_developer_links table used below).
begin;

create or replace function public.notify_submission_lifecycle() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_admin uuid;
  v_title text;
  v_kind text;
  v_heading text;
  v_link uuid;
  v_href text;
begin
  v_title := left(coalesce(nullif(btrim(new.title),''),'Game submission'),80);

  if new.status = 'Pending Review' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    for v_admin in select id from public.profiles where role = 'admin' loop
      perform public._create_notification(
        v_admin,
        'admin_new_submission',
        'New submission: ' || v_title,
        v_title || ' is ready for review.',
        '/admin/submissions?submission=' || new.id::text,
        'submission',
        new.id,
        case when tg_op = 'INSERT' then 'submission:new:' || new.id::text || ':admin:' || v_admin::text
             else 'submission:review:' || new.id::text || ':revision:' || new.submission_revision::text end
      );
    end loop;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    v_kind := case new.status
      when 'Approved' then 'submission_approved'
      when 'Rejected' then 'submission_rejected'
      when 'Needs More Information' then 'submission_needs_info'
    end;
    v_heading := case new.status
      when 'Approved' then 'Game approved'
      when 'Rejected' then 'Game submission rejected'
      when 'Needs More Information' then 'Needs more information'
    end;

    if v_kind is not null and exists(select 1 from public.profiles where id = new.developer_id) then
      -- Approved games open straight into My Games with that game selected so
      -- Start Playtest is prominently visible. Other outcomes stay on the
      -- submissions tab where the correction form lives.
      if v_kind = 'submission_approved' then
        select l.id into v_link
        from public.game_developer_links l
        where l.developer_id = new.developer_id
          and l.submission_id = new.id
        order by l.id
        limit 1;
        if v_link is not null then
          v_href := '/my-submissions?tab=games&game=' || v_link::text;
        else
          v_href := '/my-submissions?tab=games';
        end if;
      else
        v_href := '/my-submissions?tab=submissions&game=' || new.id::text;
      end if;

      perform public._create_notification(
        new.developer_id,
        v_kind,
        v_heading,
        v_title || ': ' || new.status || '. Open your submission for details.',
        v_href,
        'submission',
        new.id,
        'submission:' || v_kind || ':' || new.id::text || ':revision:' || new.submission_revision::text
      );
    end if;
  end if;

  return new;
end $$;

notify pgrst, 'reload schema';
commit;
