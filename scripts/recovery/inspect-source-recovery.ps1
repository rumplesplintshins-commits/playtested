[CmdletBinding()]
param([string]$OutputRoot = 'C:\PrivateBackups\Playtested', [ValidateSet('Managed','Drift')][string]$Inspection='Managed', [switch]$Execute)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot $(if ((Split-Path -Leaf $PSScriptRoot) -in @('recovery','maintenance')) {'..\..'} else {'..'}))).TrimEnd('\')
$root = [IO.Path]::GetFullPath($OutputRoot).TrimEnd('\')
if ($root -eq $repo -or $root.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Source audit must be saved outside the repository.' }
if (-not $Execute) { Write-Output 'PREVIEW: hidden local URI entry, isolated temporary client, read-only catalogue transaction, private output only. No source connection made.'; return }
$docker = (Get-Command docker -ErrorAction SilentlyContinue).Source
if (-not $docker) {
    foreach ($candidate in @("$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe", 'C:\Program Files\Docker\Docker\resources\bin\docker.exe')) { if (Test-Path $candidate) { $docker = $candidate; break } }
}
if (-not $docker) { throw 'Docker executable unavailable.' }
$secure = Read-Host 'Existing source Session pooler connection URI (hidden; never paste into chat)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$names = @('PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGOPTIONS')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name,'Process') }
try {
    $raw = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $uri = $null
    if (-not [Uri]::TryCreate($raw,[UriKind]::Absolute,[ref]$uri) -or $uri.Scheme -notin @('postgres','postgresql')) { throw 'A PostgreSQL URI is required.' }
    if ($uri.Host -notmatch '\.(supabase\.co|pooler\.supabase\.com)$') { throw 'Expected the source Supabase direct or Session pooler hostname.' }
    $userinfo = $uri.UserInfo.Split(':',2)
    if ($userinfo.Length -ne 2) { throw 'An existing database password is required.' }
    $env:PGHOST = $uri.Host; $env:PGPORT = $(if ($uri.Port -gt 0) { [string]$uri.Port } else { '5432' })
    if ($env:PGPORT -ne '5432') { throw 'Use direct or Session pooler port 5432, not transaction pooling.' }
    $env:PGUSER = [Uri]::UnescapeDataString($userinfo[0]); $env:PGPASSWORD = [Uri]::UnescapeDataString($userinfo[1])
    $env:PGDATABASE = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
    if ($env:PGDATABASE -ne 'postgres') { throw 'Expected the source postgres database.' }
    # Check project identity against the local public endpoint without printing it.
    $envFile = Join-Path $repo '.env.local'
    if (Test-Path $envFile) {
        $match = [regex]::Match([IO.File]::ReadAllText($envFile), '(?m)^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["'']?https://([a-z0-9]+)\.supabase\.co')
        if ($match.Success -and $env:PGHOST -ne ($match.Groups[1].Value + '.supabase.co') -and $env:PGHOST -ne ('db.' + $match.Groups[1].Value + '.supabase.co') -and $env:PGUSER -ne ('postgres.' + $match.Groups[1].Value)) { throw 'Source project does not match the local public endpoint.' }
    }
    $env:PGSSLMODE = 'require'; $env:PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=60000'
    $sqlPath = Join-Path $repo $(if($Inspection -eq 'Drift'){'supabase\inspection\rollout-drift-audit.sql'}else{'supabase\inspection\managed-schema-audit.sql'})
    $args = @('run','--rm','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user=postgres','--network=bridge','--entrypoint=psql')
    foreach ($name in $names) { $args += @('--env',$name) }
    $args += @('--mount',('type=bind,source=' + $sqlPath + ',target=/audit.sql,readonly'),'public.ecr.aws/supabase/postgres:17.11.0.006','-X','-qAt','--set=ON_ERROR_STOP=1','--file=/audit.sql')
    $result = $null
    try { $ErrorActionPreference = 'Continue'; $result = (& $docker @args 2>&1 | Out-String); $exit = $LASTEXITCODE } finally { $ErrorActionPreference = 'Stop' }
    if ($exit -ne 0) { throw 'Read-only source inspection failed. Raw diagnostics withheld; no recovery status changed.' }
    try { $audit = $result | ConvertFrom-Json } catch { throw 'Source audit returned unexpected output; raw output withheld.' }
    if ($audit.transaction_read_only -ne 'on') { throw 'Read-only source verification failed.' }
    $output = Join-Path $root ($(if($Inspection -eq 'Drift'){'rollout-drift-'}else{'source-inspection-'}) + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    if (Test-Path $output) { throw 'Audit directory already exists.' }
    New-Item -ItemType Directory -Path $output | Out-Null
    $auditName=$(if($Inspection -eq 'Drift'){'rollout-drift-audit.json'}else{'managed-schema-audit.json'})
    [IO.File]::WriteAllText((Join-Path $output $auditName), $result, (New-Object Text.UTF8Encoding($false)))
    $hash = (Get-FileHash (Join-Path $output $auditName) -Algorithm SHA256).Hash
    @{ captured_at_utc=$audit.captured_at_utc; server_version=$audit.server_version; transaction_read_only=$true; audit_sha256=$hash } | ConvertTo-Json | Set-Content (Join-Path $output 'inspection-manifest.json') -Encoding UTF8
    Write-Output "Read-only source inspection saved privately to $output. No source writes or migrations executed."
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name,$saved[$name],'Process') }
    $raw=$null; $uri=$null; $userinfo=$null; $result=$null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr); $secure.Dispose()
}
