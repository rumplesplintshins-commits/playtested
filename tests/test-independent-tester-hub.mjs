import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const id = (n) => `'00000000-0000-4000-8000-${String(n).padStart(12, "0")}'`;

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('test.account',true),'')::uuid
    $$;
    create schema playtested_studios;
    create table public.community_playtests (
      id uuid primary key, developer_id uuid, imported_game_id uuid,
      approved_game_id uuid, submission_id uuid
    );
    create table public.game_submissions (id uuid, developer_id uuid);
    create table public.game_developer_links (
      developer_id uuid, imported_game_id uuid, approved_game_id uuid, submission_id uuid
    );
    create table playtested_studios.studios (id uuid, owner_id uuid);
    create table playtested_studios.members (studio_id uuid, user_id uuid, role text);
    create table playtested_studios.games (studio_id uuid, allowance_key text);
    create table playtested_studios.launches (campaign_id uuid, scope text);
    create table public.community_game_tests (
      id uuid primary key, tester_id uuid, playtest_id uuid, submission_id uuid,
      legacy_submission_id uuid, status text, review_outcome text default 'pending',
      reservation_round integer default 1, reviewed_at timestamptz
    );
    -- Model two listings already resolved by the canonical identity service.
    create function playtested_studios.identity(i uuid,a uuid,s uuid) returns text
    language sql as $$ select case when coalesce(i,a,s) in (${id(101)},${id(102)})
      then 'steam:12345' else coalesce(i,a,s)::text end $$;
    create function public.campaign_eligible(p_id uuid,p_user uuid) returns boolean
    language sql security definer as $$ select exists(
      select 1 from public.community_playtests c where true and c.id=p_id and p_user is not null
    ) $$;
    create function public._assert_feedback_game_retry(uuid,uuid) returns void language sql as $$ select $$;
    create function public.claim_community_game_test(p_submission_id uuid) returns void
    language plpgsql security definer as $$
    begin
      perform public._assert_feedback_game_retry(p_submission_id,auth.uid());
    end $$;
    insert into public.community_playtests values (${id(201)},${id(1)},${id(101)},null,null);
    insert into public.game_submissions values (${id(102)},${id(2)});
    insert into public.game_developer_links values (${id(3)},${id(102)},null,null);
    insert into playtested_studios.studios values (${id(301)},${id(4)});
    insert into playtested_studios.members values
      (${id(301)},${id(5)},'editor'),(${id(301)},${id(6)},'viewer');
    insert into playtested_studios.games values (${id(301)},'steam:12345');
    insert into playtested_studios.launches values (${id(201)},'studio');
    insert into public.community_game_tests(id,tester_id,playtest_id,status) values
      (${id(501)},${id(1)},${id(201)},'claimed'),
      (${id(502)},${id(1)},${id(201)},'submitted');
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/20261120160000_guard_independent_tester_hub_participation.sql", import.meta.url), "utf8"));

  for (const tester of [1, 2, 3, 4, 5, 6]) {
    await db.exec(`select set_config('test.account', ${id(tester)}::text, false)`);
    await assert.rejects(db.exec(`select public.claim_community_game_test(${id(201)})`), /Independent testing is unavailable/);
    assert.equal((await db.query(`select public.campaign_eligible(${id(201)},${id(tester)}) eligible`)).rows[0].eligible, false);
    await assert.rejects(db.exec(`insert into public.community_game_tests(id,tester_id,playtest_id,status)
      values (${id(400 + tester)},${id(tester)},${id(201)},'claimed')`), { code: "42501" });
  }
  assert.equal((await db.query(`select public.campaign_eligible(${id(201)},${id(7)}) eligible`)).rows[0].eligible, true);
  await assert.rejects(db.exec(`update public.community_game_tests set status='submitted' where id=${id(501)}`), { code: "42501" });
  await assert.rejects(db.exec(`update public.community_game_tests set reservation_round=2 where id=${id(501)}`), { code: "42501" });
  await assert.rejects(db.exec(`update public.community_game_tests set status='reviewed',review_outcome='accepted'
    where id=${id(502)}`), { code: "42501" });
  await db.exec(`update public.community_game_tests set status='reviewed',review_outcome='rejected' where id=${id(502)};
    insert into public.community_game_tests(id,tester_id,playtest_id,status)
    values (${id(503)},${id(7)},${id(201)},'claimed');
    update public.community_game_tests set status='submitted' where id=${id(503)};
    update public.community_game_tests set status='reviewed',review_outcome='accepted' where id=${id(503)};`);
  assert.deepEqual((await db.query("select scope from playtested_studios.launches")).rows, [{ scope: "studio" }]);
  console.log("Independent participation guard passed");
} finally {
  await db.close();
}
