import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const model={};new Function('exports',ts.transpileModule(fs.readFileSync('lib/thumbnail.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(model);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF9sAAAAASUVORK5CYII=','base64');
assert.equal(await model.thumbnailExtension(new File([png],'fake.svg',{type:'image/png'})),'png','Storage extension derives from verified format, never supplied filename');
await assert.rejects(model.thumbnailExtension(new File(['<svg/>'],'fake.png',{type:'image/png'})),/contents/);
await assert.rejects(model.thumbnailExtension(new File([png],'real.png',{type:'image/svg+xml'})),/contents/);
await assert.rejects(model.thumbnailExtension(new File([new Uint8Array(5242881)],'large.jpg',{type:'image/jpeg'})),/5 MB/);
await assert.rejects(model.thumbnailExtension(new File([],'empty.png',{type:'image/png'})),/non-empty/);
const db=new PGlite();
try{
 await db.exec('create role anon;create role authenticated;create table game_submissions(id int,evidence_link text,title text);insert into game_submissions values(1,\'javascript:legacy\',\'Legacy\');');
 await db.exec(fs.readFileSync('supabase/migrations/202611040007_evidence_link_validation.sql','utf8'));
 await db.exec("update game_submissions set title='Updated legacy title' where id=1");
 for(const value of ['javascript:alert(1)','https://user:pass@example.test','https://bad host','https://example.test:99999','https://example.test/'+ 'x'.repeat(1000)])await assert.rejects(db.query('insert into game_submissions(id,evidence_link) values(2,$1)',[value]),/Supporting evidence/);
 for(const value of [null,'','https://example.test/process','http://example.test/notes'])await db.query('insert into game_submissions(id,evidence_link) values(2,$1)',[value]);
 console.log('PASS: image signatures, fixed extensions, empty/oversized files, safe evidence URLs and preservation of unrelated legacy edits.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
