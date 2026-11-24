import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvConfig(root);

const manifest = JSON.parse(await fs.readFile(path.join(root, 'lib/catalogue-thumbnails.json'), 'utf8'));
const sourceOrigins = [...new Set(Object.keys(manifest).map(source => new URL(source).origin))];
if (sourceOrigins.length !== 1) throw new Error('Expected one Supabase source project in the catalogue manifest.');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment.');
if (new URL(supabaseUrl).origin !== sourceOrigins[0]) throw new Error('The configured Supabase project does not match the public catalogue source project.');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data: bucket, error: bucketError } = await supabase.storage.getBucket('game-thumbnails');
if (bucketError) throw bucketError;
if (!bucket.public) throw new Error('The existing game-thumbnails bucket must remain public for anonymous catalogue artwork.');

const assets = new Map();
for (const variants of Object.values(manifest)) {
  for (const variant of variants) {
    if (!/^\/catalogue-thumbnails\/[0-9a-f]{64}-(320|640|960)\.webp$/.test(variant.url)) {
      throw new Error(`Unexpected generated asset URL: ${variant.url}`);
    }
    const objectPath = variant.url.slice(1);
    const filePath = path.join(root, 'supabase/storage/game-thumbnails', objectPath);
    const bytes = await fs.readFile(filePath);
    if (bytes.length !== variant.bytes) throw new Error(`Size mismatch for ${objectPath}`);
    assets.set(objectPath, bytes);
  }
}

let uploaded = 0;
let verifiedExisting = 0;
const entries = [...assets];
for (let offset = 0; offset < entries.length; offset += 8) {
  const results = await Promise.allSettled(entries.slice(offset, offset + 8).map(async ([objectPath, bytes]) => {
    const { error } = await supabase.storage.from('game-thumbnails').upload(objectPath, bytes, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });
    if (!error) { uploaded++; return; }
    if (!/already exists/i.test(error.message || '')) throw error;

    const { data, error: downloadError } = await supabase.storage.from('game-thumbnails').download(objectPath);
    if (downloadError || !data) throw downloadError || new Error(`Could not verify existing object ${objectPath}`);
    const existing = Buffer.from(await data.arrayBuffer());
    if (!existing.equals(bytes)) throw new Error(`Existing object differs from generated asset: ${objectPath}`);
    verifiedExisting++;
  }));
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) throw new AggregateError(failures.map(result => result.reason), `Failed to publish catalogue assets in batch ${offset / 8 + 1}.`);
}

console.log(`Verified public game-thumbnails bucket. Uploaded ${uploaded} optimized files; verified ${verifiedExisting} existing files (${[...assets.values()].reduce((sum, bytes) => sum + bytes.length, 0)} bytes total).`);
