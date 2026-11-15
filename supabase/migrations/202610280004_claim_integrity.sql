begin;
-- New Hub participation requires a campaign; direct approved-submission
-- claiming would bypass both the launch allowance and campaign capacity.
-- Existing legacy claims are not modified and retain start/submit/release.
create function public.guard_legacy_claim() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.submission_id is not null and new.status in ('claimed','in_progress') then
   raise exception 'A published Tester Hub campaign is required for new claims. Choose a campaign from the Tester Hub.';
 end if;
 return new;
end;
$$;
create trigger legacy_campaign_claim before insert on public.community_game_tests
for each row execute function public.guard_legacy_claim();

-- Freeze identity and consumption after submission; only the moderator RPC
-- owns replacement fields. Client write privileges were already revoked in V10.
create function public.guard_submitted_test() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.status in ('submitted','reviewed') then
   if tg_op='DELETE' then raise exception 'Submitted reports cannot be released or deleted.'; end if;
   if new.status not in ('submitted','reviewed') or new.tester_id<>old.tester_id
     or new.playtest_id is distinct from old.playtest_id
     or new.submission_id is distinct from old.submission_id
     or new.submitted_at is distinct from old.submitted_at then
     raise exception 'Submitted participation cannot be recycled.';
   end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger submitted_place_integrity before update or delete on public.community_game_tests
for each row execute function public.guard_submitted_test();
revoke all on function public.guard_legacy_claim(),public.guard_submitted_test(),public.fix_free_target() from public,anon,authenticated;
commit;
