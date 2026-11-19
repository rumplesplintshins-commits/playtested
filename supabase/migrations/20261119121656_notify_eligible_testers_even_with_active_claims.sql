-- Keep tester availability notifications informational: active claims should not suppress them.
-- Claim eligibility and reservation limits are enforced at the time of claiming.
-- Migration 20261119121656 already applied to production using Supabase MCP.
CREATE OR REPLACE FUNCTION public.notify_playtest_available()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tester_id uuid;
  v_title text;
  v_genre_label text;
begin

  -- Tester Hub campaigns are actionable when open and aimed at Playtested testers.
  if new.status is distinct from 'open'
     or new.audience not in ('playtested_testers', 'both')
  then
    return new;
  end if;

  -- Notify only on the transition into the actionable Tester Hub state.
  if tg_op = 'UPDATE'
     and old.status is not distinct from 'open'
     and old.audience is not distinct from new.audience
  then
    return new;
  end if;

  v_title :=
    coalesce(
      nullif(btrim(new.title), ''),
      'A game'
    );

  v_genre_label :=
    case
      when new.genre_restricted
        then nullif(btrim(new.testing_genre), '')
      else null
    end;

  for v_tester_id in

    select p.id
    from public.profiles p
    where 'tester' = any(p.roles)

      -- Reuse production rank + genre eligibility.
      and public.campaign_eligible(
        new.id,
        p.id
      )
      -- Availability alerts are informational, even when another test is active.
      -- The claim operation enforces the one-active-test rule independently.

      -- Do not alert testers once the campaign is already full.
      and (
        select available
        from public.campaign_places(new.id)
      ) > 0

  loop

    perform public._create_notification(
      v_tester_id,
      'tester_playtest_available',

      case
        when v_genre_label is null
          then 'New playtest available'
        else
          'New ' || v_genre_label || ' playtest available'
      end,

      v_title || ' is now looking for testers.',
      '/tester',
      'playtest',
      new.id,
      'playtest:available:' ||
        new.id::text ||
        ':tester:' ||
        v_tester_id::text
    );

  end loop;

  return new;
end;
$function$
;
