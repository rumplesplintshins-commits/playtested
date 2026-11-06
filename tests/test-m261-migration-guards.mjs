import fs from 'node:fs';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),sql=name=>fs.readFileSync('supabase/migrations/'+name,'utf8');
const migration=sql('202611060128_reconcile_catalogue_fixture_hotfix.sql');
try{
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 for(const file of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040107').sort())await db.exec(sql(file));
 const read=async name=>(await db.query('select prosrc,proacl,prosecdef,proowner,proconfig from pg_proc where oid=$1::regprocedure',[name])).rows[0];
 const listing='public.m26_listing_hidden(uuid,boolean)',beta='public.beta_fixture_hidden(uuid)';
 const old=await read(listing);
 await db.exec(`create or replace function public.beta_fixture_hidden(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select true; $$`);
 await assert.rejects(db.exec(migration),/Unrecognised beta_fixture_hidden/);
 await db.exec('rollback');assert.deepEqual(await read(listing),old,'First guard change rolls back when the second guard rejects an unknown body');
 await db.exec(`create or replace function public.beta_fixture_hidden(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select public._m26_legacy_fixture_hidden(p_id) or public.m26_listing_hidden(p_id);$$`);
 await db.exec(migration);const known=[await read(listing),await read(beta)];
 await db.exec(migration);assert.deepEqual([await read(listing),await read(beta)],known,'Recognized hotfix reapplication preserves body, ACLs, owner and security attributes');
 await db.exec(sql('202611060129_catalogue_custom_plan.sql'));
 const catalogue='public.get_public_catalogue(integer,integer,text,text,text,text,boolean,text)',current=await read(catalogue);
 await db.exec(sql('202611060129_catalogue_custom_plan.sql'));assert.deepEqual(await read(catalogue),current);
 await db.exec(`create or replace function public.get_public_catalogue(p_page integer default 1,p_page_size integer default 12,p_search text default '',p_genre text default 'All genres',p_verification text default 'All verification statuses',p_ai_type text default 'All AI types',p_include_nsfw boolean default false,p_sort text default 'Featured') returns table(source_type text,game_id uuid,steam_app_id text,title text,developer_name text,genre text,description text,image_url text,game_link text,ai_type text,verification_status text,quality_score numeric,submitted_at timestamptz,is_nsfw boolean,has_playtested_profile boolean,total_count bigint) language plpgsql stable as $$begin return;end;$$;`);
 await assert.rejects(db.exec(sql('202611060129_catalogue_custom_plan.sql')),/differs from reviewed/);await db.exec('rollback');
 console.log('PASS migration guards: unknown second guard aborts all128 changes, recognized production guards are no-ops, 129 safely repeats and refuses unknown catalogue definitions.');
}finally{await db.close();}
