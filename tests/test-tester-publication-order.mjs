import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
try{
 await db.exec(`
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.user',true),'')::uuid$$;
  create table public.profiles(id uuid primary key,roles text[] not null);
  create table public.community_playtests(
   id uuid primary key,title text,developer_id uuid,submission_id uuid,approved_game_id uuid,imported_game_id uuid,
   testing_genre text,instructions text,access_type text,image_url text,focus_areas text[],minimum_rank integer,
   status text,audience text,published_at timestamptz,created_at timestamptz,eligible boolean
  );
  create table public.imported_games(id uuid,developer_name text,genre text,description text,image_url text);
  create table public.approved_games(id uuid,developer_name text,genre text,description text,image_url text);
  create table public.game_submissions(id uuid,developer_name text,genre text,description text,image_url text,ai_type text,created_at timestamptz);
  create table public.community_game_tests(playtest_id uuid,tester_id uuid,status text,reservation_expires_at timestamptz,review_outcome text);
  create table public.fixture_available(
   submission_id uuid,title text,developer_name text,genre text,description text,game_link text,
   access_type text,image_url text,price text,ai_type text,focus_areas text[]
  );
  create function public.get_available_community_test_games()
   returns setof public.fixture_available language sql stable as $$select * from public.fixture_available$$;
  create function public.m26_testing_hidden(uuid,uuid) returns boolean language sql immutable as $$select false$$;
  create function public.campaign_places(uuid) returns table(available integer) language sql stable as $$select 1$$;
  create function public._feedback_game_cooldown_until(uuid,uuid) returns timestamptz language sql stable as $$select null::timestamptz$$;
  create function public._feedback_campaign_game_key(uuid) returns uuid language sql immutable as $$select $1$$;
  create function public.campaign_eligible(p_id uuid,p_user uuid) returns boolean language sql stable as $$select eligible from public.community_playtests where id=p_id$$;
  create function public.tester_rank(uuid) returns integer language sql stable as $$select 0$$;
 `);
 const user='10000000-0000-4000-8000-000000000001';
 await db.query('insert into public.profiles values ($1, array[\'tester\'])',[user]);
 const games=[
  ['20000000-0000-4000-8000-000000000010','2026-11-03T00:00:00Z','2026-11-01T00:00:00Z',true],
  ['20000000-0000-4000-8000-000000000020','2026-11-01T00:00:00Z','2026-11-01T00:00:00Z',true],
  ['20000000-0000-4000-8000-000000000030','2026-11-01T00:00:00Z','2026-11-01T00:00:00Z',true],
  ['20000000-0000-4000-8000-000000000040',null,'2026-11-02T00:00:00Z',true],
  ['20000000-0000-4000-8000-000000000050','2026-10-31T00:00:00Z','2026-11-01T00:00:00Z',false],
 ];
 for(const [id,published,created,eligible] of games){
  await db.query(`insert into public.community_playtests(id,title,testing_genre,instructions,access_type,focus_areas,minimum_rank,status,audience,published_at,created_at,eligible)
   values($1,$2,'Action','Brief','browser_game',array[]::text[],0,'open','both',$3,$4,$5)`,[id,`Campaign ${id.slice(-2)}`,published,created,eligible]);
  if(eligible)await db.query(`insert into public.fixture_available values($1,$2,'Studio','Action','Brief',null,'browser_game',null,null,null,array[]::text[])`,[id,`Campaign ${id.slice(-2)}`]);
 }
 const legacy='30000000-0000-4000-8000-000000000001';
 await db.query('insert into public.game_submissions values($1,\'Studio\',\'Action\',\'Brief\',null,null,\'2026-10-30T00:00:00Z\')',[legacy]);
 await db.query(`insert into public.fixture_available values($1,'Legacy','Studio','Action','Brief',null,'other',null,null,null,array[]::text[])`,[legacy]);
 await db.exec(fs.readFileSync('supabase/migrations/20261123222713_tester_hub_publication_order.sql','utf8'));
 await db.query('select set_config(\'test.user\',$1,false)',[user]);
 const {rows}=await db.query('select public.get_discoverable_community_test_games() as games');
 const ordered=rows[0].games;
 assert.deepEqual(ordered.map(game=>game.submission_id),[
  legacy,
  '20000000-0000-4000-8000-000000000050',
  '20000000-0000-4000-8000-000000000020',
  '20000000-0000-4000-8000-000000000030',
  '20000000-0000-4000-8000-000000000040',
  '20000000-0000-4000-8000-000000000010',
 ],'RPC returns oldest publication first, ID ties are stable, and legacy records use creation time');
 assert.equal(ordered[4].published_at,'2026-11-02T00:00:00+00:00','unpublished legacy campaign falls back to its creation timestamp');
 console.log('PASS discovery RPC migration: published_at sorting, stable ID ties, creation-time fallback, eligibility and legacy listings.');
}finally{await db.close();}
