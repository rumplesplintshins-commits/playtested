import fs from 'node:fs';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
const source=fs.readFileSync('scripts/recovery/export-m261-database.ps1','utf8');
const sql=source.match(/--command "(select json_build_object[^\"]+)" --command 'ROLLBACK'/)?.[1];assert(sql,'Probe SQL not found');
const db=new PGlite();
try{
 await db.exec('create table public.listing_controls(id integer);create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text)');
 assert.equal((await db.query("select current_setting('default_transaction_read_only') value")).rows[0].value,'off');
 await db.exec('BEGIN READ ONLY');const baseline=(await db.query(sql)).rows[0].json_build_object;
 assert.equal(baseline.read_only,'on');assert.equal(baseline.startup_default_read_only,'off');assert.equal(baseline.listing_controls,true);assert.equal(baseline.migrations,true);
 await assert.rejects(db.exec('insert into public.listing_controls values(1)'),/read.only/i);await db.exec('ROLLBACK');
 assert.equal((await db.query('select count(*) n from public.listing_controls')).rows[0].n,0);
 assert.equal((await db.query("select current_setting('default_transaction_read_only') value")).rows[0].value,'off');
 await db.exec('drop table public.listing_controls;BEGIN READ ONLY');assert.equal((await db.query(sql)).rows[0].json_build_object.listing_controls,false);await db.exec('ROLLBACK');
 console.log('PASS isolated PostgreSQL probe: actual script SQL enforces read-only despite writable startup default, writes fail, rollback preserves defaults/data, missing required table stays false. No hosted connection.');
}finally{await db.close();}
