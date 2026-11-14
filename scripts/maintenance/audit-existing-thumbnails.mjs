/**
 * Read-only inventory and optional local backup/optimisation of existing thumbnails.
 * NEVER uploads, replaces or deletes Storage objects or changes database URLs.
 *
 * Preview: node --env-file=.env.local scripts/maintenance/audit-existing-thumbnails.mjs
 * Export:  node --env-file=.env.local scripts/maintenance/audit-existing-thumbnails.mjs --export --output C:\\playtested-thumbnail-backup-YYYYMMDD
 *
 * The export destination must be new and outside this repository.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const PROJECT = 'qtcmzckdhgahuqqilmzj';
const BUCKET = 'game-thumbnails';
const args = process.argv.slice(2);
const exporting = args.includes('--export');
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!endpoint || !secret) throw new Error('Missing Supabase environment variables');
if (new URL(endpoint).hostname !== PROJECT + '.supabase.co') {
  throw new Error('Expected production project ' + PROJECT + '; no requests made');
}
if (exporting && !output) throw new Error('Export requires --output with a new directory outside the repository');
if (!exporting && output) throw new Error('--output requires --export');
if (exporting) {
  const resolved = path.resolve(output);
  const repo = process.cwd();
  const relative = path.relative(repo, resolved);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..') || resolved === path.parse(resolved).root) {
    throw new Error('Output must be outside the repository and cannot be a drive root');
  }
  await fs.access(resolved).then(() => { throw new Error('Output directory already exists; refusing overwrite'); }, e => {
    if (e.code !== 'ENOENT') throw e;
  });
}

const client = createClient(endpoint, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const objects = [];
async function visit(prefix = '') {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.storage.from(BUCKET).list(prefix, {
      limit: 100, offset, sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error('Storage inventory failed: ' + error.message);
    for (const item of data ?? []) {
      const name = prefix ? prefix + '/' + item.name : item.name;
      if (item.id === null || item.id === undefined) {
        await visit(name);
      } else {
        objects.push({ name, bytes: Number(item.metadata?.size ?? 0), mime: item.metadata?.mimetype ?? null });
      }
    }
    if ((data?.length ?? 0) < 100) break;
  }
}
await visit();
objects.sort((a, b) => b.bytes - a.bytes);
const big = objects.filter(x => x.bytes > 1024 * 1024);
const mb = bytes => (bytes / 1048576).toFixed(2);
console.log(JSON.stringify({
  mode: exporting ? 'local-backup-and-convert' : 'read-only-preview',
  project: PROJECT, bucket: BUCKET, objects: objects.length,
  over1MB: big.length, oversizedMB: mb(big.reduce((n, x) => n + x.bytes, 0)),
  totalMB: mb(objects.reduce((n, x) => n + x.bytes, 0)),
  largest: objects.slice(0, 12),
}, null, 2));
if (!exporting) process.exit(0);

const dest = path.resolve(output);
await fs.mkdir(path.join(dest, 'originals'), { recursive: true });
await fs.mkdir(path.join(dest, 'optimised'), { recursive: true });
const manifest = { project: PROJECT, bucket: BUCKET, createdAt: new Date().toISOString(), remoteWrites: false, entries: [] };
for (const item of objects) {
  // Export all originals, including small ones. Only create a WebP when smaller.
  const { data, error } = await client.storage.from(BUCKET).download(item.name);
  if (error || !data) throw new Error('Download failed for ' + item.name + ': ' + (error?.message ?? 'empty response'));
  const buffer = Buffer.from(await data.arrayBuffer());
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const originalName = hash + '.bin';
  await fs.writeFile(path.join(dest, 'originals', originalName), buffer, { flag: 'wx' });
  const record = { storagePath: item.name, originalFile: 'originals/' + originalName,
    originalBytes: buffer.length, originalSha256: hash, optimisedFile: null, optimisedBytes: null };
  try {
    const image = sharp(buffer, { failOn: 'error', limitInputPixels: 50_000_000 });
    const meta = await image.metadata();
    if (meta.pages && meta.pages > 1) {
      record.skipped = 'animated/multipage image';
    } else {
      const candidate = await image.rotate().resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 }).toBuffer();
      if (candidate.length < buffer.length) {
        const name = hash + '.webp';
        await fs.writeFile(path.join(dest, 'optimised', name), candidate, { flag: 'wx' });
        record.optimisedFile = 'optimised/' + name;
        record.optimisedBytes = candidate.length;
      } else record.skipped = 'WebP not smaller';
    }
  } catch (error) {
    record.skipped = 'unsupported/corrupt image: ' + error.message;
  }
  manifest.entries.push(record);
}
await fs.writeFile(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
console.log('Local backup and candidate conversions complete: ' + dest);
console.log('No remote Storage or database changes were made.');
