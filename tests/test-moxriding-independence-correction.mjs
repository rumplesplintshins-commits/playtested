import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(new URL("../supabase/migrations/20261120160100_restore_moxriding_independent_testing.sql", import.meta.url), "utf8");
const report = "'f89bdb83-af73-4938-98e9-8ba114992dc4'";
const campaign = "'0268cdcc-8603-404c-ad5e-c37914248b37'";
const submission = "'6ce56e5e-e2fb-4562-a859-3f751d3b1eba'";
const owner = "'00000000-0000-4000-8000-000000000001'";
const other = "'00000000-0000-4000-8000-000000000002'";
const readers = [
  "get_campaign_testing_details(uuid)", "get_accepted_game_test_counts()", "get_accepted_game_test_feedback(uuid)",
  "get_accepted_game_test_ratings()", "get_game_community_reception()", "get_public_imported_playtest_feedback(uuid)",
  "get_public_intent_counts(jsonb)", "get_public_submission_playtest_feedback(uuid)",
  "get_public_submission_playtest_history(uuid)", "get_developer_accepted_playtest_feedback(uuid)",
  "get_developer_current_reception()", "get_developer_playtested_test_progress(uuid)", "get_developer_test_rank(uuid)",
  "get_studio_workspace(uuid)", "process_campaign_completion()", "tester_rank(uuid)",
  "get_my_testing_progress()", "m26_tester_analytics()",
];

const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema playtested_studios;
    create table public.profiles (id uuid primary key, tester_xp integer, completed_tests integer);
    create table public.community_playtests (
      id uuid primary key, developer_id uuid, submission_id uuid, status text, target_testers integer,
      audience text, published_at timestamptz, completed_at timestamptz, tester_hub_started_at timestamptz
    );
    create table public.community_game_tests (
      id uuid primary key, playtest_id uuid, tester_id uuid, status text,
      review_outcome text, overall_score integer, base_xp_amount integer, xp_awarded boolean, feedback text
    );
    create table public.test_review_events (test_id uuid, kind text, xp_delta integer, actual_xp_award integer);
    create table playtested_studios.launches (campaign_id uuid primary key, launched_at timestamptz);
    create table public.notifications (campaign_id uuid);
    create function public.launch_guard() returns trigger language plpgsql as $$
    begin
      if old.status='closed' then raise exception 'Closed'; end if;
      return new;
    end $$;
    create function public.notify_fixture() returns trigger language plpgsql as $$
    begin
      insert into public.notifications values (new.id);
      return null;
    end $$;
    create trigger playtested_guard_launch before update on public.community_playtests
      for each row execute function public.launch_guard();
    create trigger m26_capacity_availability after update on public.community_playtests
      for each row execute function public.notify_fixture();
    create trigger notify_playtest_available after update on public.community_playtests
      for each row execute function public.notify_fixture();
    insert into public.profiles values (${owner},140,3),(${other},200,4);
    insert into public.community_playtests values (${campaign},${owner},${submission},'closed',1,'both',
      '2026-11-20 02:07:35.154736+00','2026-11-20 07:36:56.995163+00','2026-11-20 02:07:35.204975+00');
    insert into playtested_studios.launches select id,tester_hub_started_at from public.community_playtests;
    insert into public.community_game_tests values
      (${report},${campaign},${owner},'reviewed','accepted',10,40,true,'private evidence'),
      (${other},${other},${other},'reviewed','accepted',8,50,true,'independent feedback');
    insert into public.test_review_events values (${report},'accepted',40,40);
    create function public.campaign_places(uuid) returns table(available integer)
    language sql security definer as $$
      select 1-count(*)::integer from public.community_game_tests where playtest_id=$1
    $$;
    ${readers.map((signature) => `create function public.${signature} returns setof integer
      language sql security definer as $$ select overall_score from public.community_game_tests order by overall_score $$;`).join("\n")}
  `);

  await db.exec(`update public.profiles set tester_xp=141 where id=${owner}`);
  await assert.rejects(db.exec(migration), /baseline changed/);
  await db.exec("rollback");
  await db.exec(`update public.profiles set tester_xp=140 where id=${owner}`);
  await db.exec(migration);
  const state = async () => (await db.query(`
    select p.tester_xp,p.completed_tests,c.status,c.completed_at,c.published_at=l.launched_at as same_stamp,
      (select available from public.campaign_places(c.id)) available,
      (select count(*)::int from public.notifications) notifications,
      (select count(*)::int from playtested_studios.launches) launches,
      (select count(*)::int from playtested_studios.independence_corrections) corrections
    from public.profiles p join public.community_playtests c on c.developer_id=p.id
    join playtested_studios.launches l on l.campaign_id=c.id where c.id=${campaign}
  `)).rows[0];
  const corrected = await state();
  assert.deepEqual(corrected, {
    tester_xp: 100, completed_tests: 2, status: "open", completed_at: null,
    same_stamp: false, available: 1, notifications: 0, launches: 1, corrections: 1,
  });
  assert.deepEqual((await db.query("select * from public.get_game_community_reception()")).rows,
    [{ get_game_community_reception: 8 }]);
  assert.deepEqual((await db.query(`select review_outcome,feedback from public.community_game_tests where id=${report}`)).rows,
    [{ review_outcome: "accepted", feedback: "private evidence" }]);
  await assert.rejects(db.exec(`delete from public.community_game_tests where id=${report}`), { code: "42501" });
  await assert.rejects(db.exec(migration), /already exists/);
  await db.exec("rollback");
  assert.deepEqual(await state(), corrected);
  console.log("MoxRiding correction, rollback, evidence retention and replay protection passed");
} finally {
  await db.close();
}
