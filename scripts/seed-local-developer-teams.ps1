$ErrorActionPreference = 'Continue'
$localStatus = @{}
npx.cmd --yes supabase status -o env 2>$null | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="(.*)"\s*$') { $localStatus[$matches[1]] = $matches[2] }
}
$ErrorActionPreference = 'Stop'
if ([uri]$localStatus.API_URL -ne [uri]'http://127.0.0.1:54341' -or !$localStatus.SERVICE_ROLE_KEY -or !$localStatus.ANON_KEY) {
  throw 'Expected the running loopback Supabase project on port 54341.'
}

$credentialFolder = Join-Path (Get-Location) '.backup-tools/developer-teams'
$null = New-Item -ItemType Directory -Path $credentialFolder -Force
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$null = icacls.exe $credentialFolder /inheritance:r /grant:r "*${sid}:(OI)(CI)F"
if ($LASTEXITCODE) { throw 'Could not restrict fixture credential permissions.' }

$env:LOCAL_STUDIO_SUPABASE_URL = $localStatus.API_URL
$env:LOCAL_STUDIO_SERVICE_KEY = $localStatus.SERVICE_ROLE_KEY
try {
  node scripts/seed-local-developer-teams.mjs
  if ($LASTEXITCODE) { throw 'Could not seed local studio accounts.' }
} finally {
  Remove-Item Env:LOCAL_STUDIO_SERVICE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:LOCAL_STUDIO_SUPABASE_URL -ErrorAction SilentlyContinue
}

Get-Content -Raw -Encoding utf8 supabase/development/developer-teams-fixture.sql |
  docker exec -i supabase_db_supabase psql -U postgres -d postgres -X -v ON_ERROR_STOP=1
if ($LASTEXITCODE) { throw 'Could not seed the local games and playtest feedback.' }

if (!(Test-Path .env.local)) {
  [IO.File]::WriteAllLines((Join-Path (Get-Location) '.env.local'), @(
    "NEXT_PUBLIC_SUPABASE_URL=$($localStatus.API_URL)"
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$($localStatus.ANON_KEY)"
  ))
} elseif (!(Select-String -Quiet -LiteralPath .env.local -SimpleMatch $localStatus.API_URL)) {
  throw 'Existing .env.local points outside the expected loopback project. Use a separate checkout.'
}
