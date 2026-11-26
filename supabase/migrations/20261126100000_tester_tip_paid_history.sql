-- Paid tester tips: one durable ledger drives developer, tester and admin history.
BEGIN;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
  'admin_new_submission','submission_needs_info','submission_approved','submission_rejected',
  'tester_playtest_available','tester_feedback_useful','developer_feedback_received',
  'campaign_completed','admin_feedback_moderation','tester_tip_received'
));

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
    'admin_feedback_moderation',
    'tester_tip_received'
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
REVOKE ALL ON FUNCTION public._create_notification(uuid,text,text,text,text,text,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public._notify_paid_tester_tip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_title text;
  v_amount text;
BEGIN
  IF OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid' THEN
    SELECT coalesce(nullif(btrim(c.title),''),'a game')
      INTO v_title FROM public.community_playtests c WHERE c.id=NEW.playtest_id;
    v_amount := '£' || to_char(NEW.tip_amount_pence / 100.0,'FM999990.00');
    PERFORM public._create_notification(
      NEW.tester_id,'tester_tip_received',
      v_amount || ' tip received!',
      'A developer has sent you a thank-you tip for your accepted feedback on ' || coalesce(v_title,'a game') || '.',
      '/tester#testing-activity-' || NEW.test_id::text,
      'playtest',NEW.playtest_id,'tester-tip:paid:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tester_tip_paid_notification ON playtested_studios.tester_tips;
CREATE TRIGGER tester_tip_paid_notification
AFTER UPDATE OF status ON playtested_studios.tester_tips
FOR EACH ROW EXECUTE FUNCTION public._notify_paid_tester_tip();

CREATE OR REPLACE FUNCTION public.get_developer_tester_tip(p_test_id uuid)
RETURNS TABLE(status text,tip_amount_pence integer,paid_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.community_game_tests t
    JOIN public.community_playtests c ON c.id=t.playtest_id
    WHERE t.id=p_test_id AND c.developer_id=auth.uid()
  ) THEN
    RAISE EXCEPTION 'Developer access required.';
  END IF;
  RETURN QUERY
  SELECT x.status,x.tip_amount_pence,x.paid_at
  FROM playtested_studios.tester_tips x
  WHERE x.test_id=p_test_id AND x.developer_id=auth.uid()
  ORDER BY x.created_at DESC LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_tester_tip_history()
RETURNS TABLE(test_id uuid,playtest_id uuid,tip_amount_pence integer,paid_at timestamptz,game_title text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  RETURN QUERY
  SELECT x.test_id,x.playtest_id,x.tip_amount_pence,x.paid_at,
    coalesce(nullif(btrim(c.title),''),'Previously tested game')
  FROM playtested_studios.tester_tips x
  JOIN public.community_playtests c ON c.id=x.playtest_id
  WHERE x.tester_id=auth.uid() AND x.status='paid'
  ORDER BY x.paid_at DESC,x.id DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_tester_tip_history(p_test_ids uuid[])
RETURNS TABLE(test_id uuid,tip_amount_pence integer,paid_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'
  ) THEN RAISE EXCEPTION 'Administrator access required.'; END IF;
  IF p_test_ids IS NULL OR cardinality(p_test_ids)>500 THEN
    RAISE EXCEPTION 'Invalid review selection.';
  END IF;
  RETURN QUERY
  SELECT x.test_id,x.tip_amount_pence,x.paid_at
  FROM playtested_studios.tester_tips x
  WHERE x.test_id=ANY(p_test_ids) AND x.status='paid'
  ORDER BY x.paid_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public._notify_paid_tester_tip(),
 public.get_developer_tester_tip(uuid),public.get_my_tester_tip_history(),
 public.get_admin_tester_tip_history(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_developer_tester_tip(uuid),
 public.get_my_tester_tip_history(),public.get_admin_tester_tip_history(uuid[]) TO authenticated;

COMMIT;
