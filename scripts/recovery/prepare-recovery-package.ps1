[CmdletBinding()]
param([string]$PackageDirectory='C:\PrivateBackups\Playtested-Recovery-20261028', [switch]$Execute)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot $(if ((Split-Path -Leaf $PSScriptRoot) -in @('recovery','maintenance')) {'..\..'} else {'..'}))).TrimEnd('\')
$package=[IO.Path]::GetFullPath($PackageDirectory).TrimEnd('\')
if($package.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or $package.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Recovery package must be outside the repository.' }
if(Test-Path -LiteralPath $package) { throw 'Use an unused package directory; do not overwrite recovery evidence.' }
$backup='C:\PrivateBackups\Playtested\20261028-104630'
$source=Get-ChildItem 'C:\PrivateBackups\Playtested' -Directory | Where-Object Name -Match '^source-inspection-\d{8}-\d{6}$' | Sort-Object Name -Descending | Select-Object -First 1
if(-not $source -or -not(Test-Path (Join-Path $source.FullName 'managed-customizations.sql'))) { throw 'Read-only source audit and reviewed recovery supplement are required.' }
$manifest=Get-Content (Join-Path $backup 'manifest.json') -Raw | ConvertFrom-Json
foreach($file in $manifest.export_files) { if((Get-FileHash (Join-Path $backup $file.name) -Algorithm SHA256).Hash -ne $file.sha256) { throw 'Original backup hash mismatch.' } }
if(-not $Execute) { Write-Output 'PREVIEW: package verified exports, source supplement, tested source, migrations and selected evidence. No password or archive created.'; return }
New-Item -ItemType Directory $package | Out-Null
foreach($part in @('database','source-inspection','evidence','migrations','tested-source','harnesses','source-accommodations')) { New-Item -ItemType Directory (Join-Path $package $part)|Out-Null }
foreach($file in @('roles.sql','schema.sql','data.sql','manifest.json')) { Copy-Item -LiteralPath (Join-Path $backup $file) -Destination (Join-Path $package 'database') }
foreach($file in @('managed-schema-audit.json','inspection-manifest.json','managed-customizations.sql')) { Copy-Item -LiteralPath (Join-Path $source.FullName $file) -Destination (Join-Path $package 'source-inspection') }
foreach($file in @('restored-database-rehearsal.md','rehearsal-source-manifest.json','rehearsal-table-reconciliation.json','managed-schema-recovery-audit.json','recovery-gap-closure.md')) {
    if(-not(Test-Path (Join-Path $repo ('docs\'+$file)))) { throw ('Required recovery evidence is missing: '+$file) }
    Copy-Item -LiteralPath (Join-Path $repo ('docs\'+$file)) -Destination (Join-Path $package 'evidence')
}
foreach($file in @('database-checks.json','row-count-verification.json','foreign-key-checks.json','browser-checks.json','api-signal-checks.json','fresh-signup-checks.json','preservation-post-tests.json')) {
    $path=Join-Path $repo ('.backup-tools\rehearsal\'+$file)
    if(-not(Test-Path $path)) { throw ('Required rehearsal evidence is missing: '+$file) }
    Copy-Item -LiteralPath $path -Destination (Join-Path $package 'evidence')
}
Get-ChildItem (Join-Path $repo 'supabase\migrations') -Filter '*.sql' | Copy-Item -Destination (Join-Path $package 'migrations')
foreach($file in @('tests\test-restored-database.mjs','tests\test-restored-browser.mjs','tests\test-fresh-signup.mjs','scripts\recovery\inspect-source-recovery.ps1','scripts\recovery\compare-managed-audit.mjs','scripts\recovery\record-rehearsal-evidence.mjs','scripts\recovery\protect-recovery-package.ps1','scripts\recovery\verify-offsite-backup.ps1')) { Copy-Item -LiteralPath (Join-Path $repo $file) -Destination (Join-Path $package 'harnesses') }
Copy-Item -LiteralPath (Join-Path $repo 'supabase\inspection\managed-schema-audit.sql') -Destination (Join-Path $package 'harnesses')
Copy-Item -LiteralPath (Join-Path $repo 'app\layout.tsx') -Destination (Join-Path $package 'source-accommodations\original-layout.tsx')
Copy-Item -LiteralPath (Join-Path $repo 'tsconfig.json') -Destination (Join-Path $package 'source-accommodations\original-tsconfig.json')
$docker=Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
if(-not(Test-Path $docker)) { $docker=(Get-Command docker -ErrorAction Stop).Source }
# The tested image has no postcss.config.mjs: CSS is configured by the
# Turbopack rules in next.config.ts. Require every actual source component.
$requiredSourceParts=@('app','lib','public','package.json','package-lock.json','next.config.ts','tsconfig.json','proxy.ts')
foreach($part in $requiredSourceParts) {
    & $docker cp ('playtested-rehearsal-app:/app/'+$part) (Join-Path $package 'tested-source')
    if($LASTEXITCODE -ne 0) { throw 'Tested source copy failed; package incomplete.' }
}
foreach($part in $requiredSourceParts) { if(-not(Test-Path -LiteralPath (Join-Path $package ('tested-source\'+$part)))) { throw ('Required packaged source is missing: '+$part) } }
$files=Get-ChildItem -LiteralPath $package -File -Recurse | Sort-Object FullName | ForEach-Object { @{path=$_.FullName.Substring($package.Length+1);bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash} }
@{prepared_at_utc=[DateTime]::UtcNow.ToString('o');production_application_authorised=$false;files=@($files)} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $package 'package-manifest.json') -Encoding UTF8
Write-Output ('Prepared private recovery package: '+$package+' ('+@($files).Count+' hashed files). Original exports remain unchanged. Ready for password-prompt encryption.')
