// Isolated PR #67 runner. Credentials stay in an ignored local file and child env.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, '.backup-tools/private-evidence-qa-20261116a/app-local-environment.json');
export function qaEnvironment(values, inherited = process.env) {
  if (values.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:55741') throw Error('Expected isolated QA Supabase on port 55741.');
  for (const name of ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (typeof values[name] !== 'string' || !values[name].trim()) throw Error('Missing QA configuration: ' + name);
  }
  const key = values.SUPABASE_SERVICE_ROLE_KEY;
  if (Object.entries(values).some(([name, value]) => name.startsWith('NEXT_PUBLIC_') && value === key)) throw Error('A server credential cannot be public.');
  // This saved stack uses legacy local JWT keys. Verify the server credential's role.
  try { if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role !== 'service_role') throw Error(); }
  catch { throw Error('Expected a local QA service-role credential.'); }
  const env = {};
  for (const [name, value] of Object.entries(inherited)) if (!/SUPABASE|^NEXT_PUBLIC_|SERVICE_ROLE|SECRET|TOKEN|DATABASE_URL/.test(name)) env[name] = value;
  return {...env, ...values, SUPABASE_URL: 'http://127.0.0.1:55741', NEXT_PUBLIC_SITE_ORIGIN: 'http://localhost:3067'};
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const env = qaEnvironment(JSON.parse(fs.readFileSync(configPath, 'utf8')));
  // Network guard applies only to this dedicated QA child process.
  const guard = path.join(root, '.backup-tools/private-evidence-qa-20261116a/local-network-guard.cjs');
  const args = process.argv.includes('--build') ? ['build'] : ['dev', '--hostname', 'localhost', '--port', '3067'];
  console.log('PR #67 QA: API 127.0.0.1:55741; server analytics credential configured.');
  const child = cp.spawn(process.execPath, ['--require', guard, path.join(root, 'node_modules/next/dist/bin/next'), ...args], {cwd: root, env, stdio: 'inherit', windowsHide: true});
  child.on('error', () => { console.error('Could not start the local QA application.'); process.exitCode = 1; });
  child.on('exit', code => process.exit(code ?? 1));
}
