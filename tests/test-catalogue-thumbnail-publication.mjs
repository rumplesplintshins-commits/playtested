import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {assertPublicSources} from '../scripts/prepare-catalogue-thumbnails.mjs';
const publication=JSON.parse(fs.readFileSync('lib/catalogue-thumbnail-publication.json'));
const manifest=JSON.parse(fs.readFileSync('lib/catalogue-thumbnails.json'));
assert(Object.keys(manifest).length>0,'Do not silently disable existing thumbnail optimisation');
assertPublicSources(Object.keys(manifest).map(url=>({url})),publication);
const referenced=new Set(Object.values(manifest).flat().map(v=>path.basename(v.url)));
const actual=fs.readdirSync('public/catalogue-thumbnails');
assert.deepEqual(new Set(actual),referenced,'Every public static file must belong to a verified catalogue mapping; no orphan assets');
for(const variants of Object.values(manifest))for(const v of variants){assert.match(v.url,/^\/catalogue-thumbnails\/[0-9a-f]{64}-(320|640|960)\.webp$/);assert.equal(fs.statSync(path.join('public',v.url)).size,v.bytes);}
for(const file of ['app/submit/page.tsx','app/components/SubmissionCorrection.tsx'])assert(fs.readFileSync(file,'utf8').includes('uploadGameThumbnail('),'Submission and edit share the original-preserving uploader');
assert(!fs.readFileSync('lib/catalogue-thumbnail.ts','utf8').includes('sharp'),'Runtime catalogue selection must not process images');
console.log(`PASS publication boundary: ${Object.keys(manifest).length} anonymous public mappings, ${actual.length} referenced static variants, no unverified/orphan assets; submission/edit parity`);
