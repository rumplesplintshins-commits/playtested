begin;
do $$begin
 if to_regprocedure('public.claim_next_pulse_job()') is null then raise exception 'Existing PULSE queue/claim function required.';end if;
end;$$;
create table public.pulse_worker_heartbeats(
 worker_id uuid primary key, ready boolean not null, busy boolean not null,
 received_at timestamptz not null default clock_timestamp(),active_job_id uuid references public.pulse_jobs(id)
);
alter table public.pulse_worker_heartbeats enable row level security;
revoke all on public.pulse_worker_heartbeats from public,anon,authenticated;
grant select,insert,update,delete on public.pulse_worker_heartbeats to service_role;
create function public.record_pulse_worker_heartbeat(p_worker uuid,p_ready boolean,p_busy boolean,p_job uuid default null) returns void
language plpgsql security definer set search_path='' as $$begin
 delete from public.pulse_worker_heartbeats where received_at<clock_timestamp()-interval '1 day';
 insert into public.pulse_worker_heartbeats values(p_worker,p_ready,p_busy,clock_timestamp(),p_job)
 on conflict(worker_id) do update set ready=excluded.ready,busy=excluded.busy,received_at=excluded.received_at,active_job_id=excluded.active_job_id;
end;$$;
create function public.get_pulse_availability() returns text
language sql volatile security definer set search_path='' as $$
 select case when bool_or(not busy) then 'available' when bool_or(busy) then 'busy' else 'unavailable' end
 from public.pulse_worker_heartbeats where ready and received_at>clock_timestamp()-interval '90 seconds';
$$;
create function public.pulse_job_worker_alive(p_job uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from public.pulse_worker_heartbeats where active_job_id=p_job and received_at>clock_timestamp()-interval '90 seconds');
$$;
revoke all on function public.pulse_job_worker_alive(uuid) from public,anon,authenticated;
grant execute on function public.pulse_job_worker_alive(uuid) to service_role;
alter table public.pulse_jobs add column input_key text;
create unique index pulse_jobs_equivalent_input_once on public.pulse_jobs(submission_id,input_key) where input_key is not null;
create function public.enqueue_available_pulse_job(p_submission uuid,p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.game_submissions; j public.pulse_jobs; source text; key text; availability text;
begin
 select * into s from public.game_submissions where id=p_submission for share;
 if not found or s.developer_id is distinct from p_actor or p_actor is null then raise exception 'Submission access denied' using errcode='42501';end if;
 source:=btrim(coalesce(s.game_link,''));
 -- Existing execution worker supports browser ZIPs with root index.html, not Steam/native executables.
 if source!~* '^https://[^[:space:]]+[.]zip([?#].*)?$' then return jsonb_build_object('state','unsupported');end if;
 key:=md5(jsonb_build_array(source,'v6.10','v6.10','quick')::text);
 perform pg_advisory_xact_lock(hashtextextended('pulse-input:'||p_submission::text,0));
 select * into j from public.pulse_jobs where submission_id=p_submission
   and (input_key=key or (input_key is null and build_url=source and worker_version='v6.10' and test_suite_version='v6.10'))
   order by created_at desc limit 1;
 if found then return jsonb_build_object('state','existing','job',to_jsonb(j));end if;
 availability:=public.get_pulse_availability();
 if availability not in('available','busy') then return jsonb_build_object('state','unavailable');end if;
 insert into public.pulse_jobs(submission_id,developer_id,build_url,input_key,engine_version,worker_version,test_suite_version)
 values(s.id,p_actor,source,key,'PULSE v1','v6.10','v6.10') returning * into j;
 return jsonb_build_object('state','queued','availability',availability,'job',to_jsonb(j));
end;$$;
revoke all on function public.record_pulse_worker_heartbeat(uuid,boolean,boolean,uuid),public.enqueue_available_pulse_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.record_pulse_worker_heartbeat(uuid,boolean,boolean,uuid),public.enqueue_available_pulse_job(uuid,uuid) to service_role;
revoke all on function public.get_pulse_availability() from public;
grant execute on function public.get_pulse_availability() to anon,authenticated,service_role;
revoke insert on public.pulse_jobs from anon,authenticated;
-- Queue claims remain worker-only; existing historical SELECT policies are unchanged.
revoke all on function public.claim_next_pulse_job() from public,anon,authenticated;
grant execute on function public.claim_next_pulse_job() to service_role;
notify pgrst,'reload schema';
commit;
