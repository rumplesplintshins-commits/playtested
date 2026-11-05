// Replay metadata definitions into synthetic PGlite only, never a hosted database.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
const file=process.argv[2];if(!file)throw Error('Supply a private SELECT-only preflight snapshot');
const bytes=fs.readFileSync(file),raw=bytes[0]===255&&bytes[1]===254?bytes.toString('utf16le'):bytes.toString('utf8');
const a=JSON.parse(raw.replace(/^\uFEFF/,'')).rows[0].assessment;
const fn=Object.fromEntries(a.functions.map(f=>[f.signature,f]));
assert.equal(fn['get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'].hash,'6370f934d6a97230e0f7628d9a4207db');
assert.equal(fn['m26_listing_hidden(uuid,boolean)'].hash,'311f8162b0ecc6fa6d9a380db456b8c3');
for(const signature of ['beta_fixture_hidden(uuid)','m26_listing_hidden(uuid,boolean)']){assert.equal(fn[signature].language,'plpgsql');assert.equal(fn[signature].owner,'postgres');assert.equal(fn[signature].definer,true);}
assert.equal(fn['get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'].definer,false);
assert(a.migrations.some(m=>m.name==='merge26_catalogue_fixture_guard_plpgsql_hotfix'));
assert.equal(a.migrations.at(-1).version,'20261105200930','Unreviewed migration-history drift: stop release');
assert.equal(a.migrations.at(-1).name,'merge26_catalogue_fixture_guard_plpgsql_hotfix');
assert(!a.migrations.some(m=>/^20261106012[89]|^20261106013[01]/.test(m.version)),'Pending status changed: reassess before release');
assert(a.rls.every(t=>t.enabled));
for(const [table,column,type] of [['game_submissions','title','text'],['game_submissions','steam_app_id','text'],['listing_revisions','proposed','jsonb'],['listing_revisions','before_fields','jsonb'],['game_developer_links','source_claim_id','uuid']])assert(a.columns.some(c=>c.table===table&&c.column===column&&c.type===type),'Unexpected dependency '+table+'.'+column);
const db=new PGlite();
try{
 await db.exec(fs.readFileSync('tests/fixtures/merge26-schema.sql','utf8'));
 for(const f of fs.readdirSync('supabase/migrations').filter(f=>f.includes('merge26_')&&f.slice(0,12)<='202611040107').sort())await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 await db.exec('create table if not exists public.game_claims(id uuid primary key,status text)');
 for(const signature of ['m26_listing_hidden(uuid,boolean)','beta_fixture_hidden(uuid)','get_public_catalogue(integer,integer,text,text,text,text,boolean,text)'])await db.exec(fn[signature].definition);
 const guards=async()=>(await db.query("select proname,prosrc,proacl,prosecdef,proowner,proconfig from pg_proc where proname in('m26_listing_hidden','beta_fixture_hidden') order by proname")).rows;
 const before=await guards();
 const files=fs.readdirSync('supabase/migrations').filter(f=>/^2026110601(28|29|30|31)_/.test(f)).sort();assert.equal(files.length,4);
 for(const f of files){await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));if(f.includes('0128_'))assert.deepEqual(await guards(),before,'Actual production hotfix definitions must remain byte-identical');}
 assert.equal((await db.query("select prosecdef from pg_proc where proname='get_public_catalogue'")).rows[0].prosecdef,false);
 const result={captured_at:a.captured_at,validated_at:new Date().toISOString(),production_writes:0,production_counts:a.counts,production_hotfix_noop:true,metadata_rehearsal:'Passed128-131 against actual production function definitions and checked column types in synthetic PGlite; not a full database restore',production_rls_enabled:true,pending_versions:files.map(f=>f.slice(0,12)),migration_history:a.migrations,migration_sha256_lf:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync('supabase/migrations/'+f,'utf8').replace(/\r\n/g,'\n')).digest('hex')])),indexes:a.indexes,triggers:a.triggers,functions:a.functions.map(({definition,...f})=>f),limitations:['No production data restored','Provider recoverability and current backup coverage remain separate gates','Production performance after release not measured']};
 fs.mkdirSync('docs/performance',{recursive:true});fs.writeFileSync('docs/performance/MERGE-26-1-PRODUCTION-COMPATIBILITY.json',JSON.stringify(result,null,2));
 console.log('PASS actual production metadata replay: known guard bodies unchanged;128-131 compile; catalogue stays invoker; dependency types and RLS verified. No production writes.');
}finally{await db.close();}
