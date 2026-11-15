$ErrorActionPreference = 'Stop'
$helper = Join-Path $PSScriptRoot '..\scripts\recovery\backup-database.ps1'
$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($helper, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count) { throw 'Backup helper syntax check failed.' }
$readiness = Join-Path $PSScriptRoot '..\scripts\recovery\check-backup-readiness.ps1'
[System.Management.Automation.Language.Parser]::ParseFile($readiness, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count) { throw 'Readiness helper syntax check failed.' }
$savedPath = $env:PATH
try {
    $env:PATH = ''
    $rejected = $false
    try { & $readiness -RequireReady | Out-Null } catch {
        if ($_.Exception.Message -notmatch 'Export prerequisites unavailable') { throw }
        $rejected = $true
    }
    if (-not $rejected) { throw 'Missing export tools must block execution.' }
} finally { $env:PATH = $savedPath }

$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$previewTarget = Join-Path ([IO.Path]::GetTempPath()) ('playtested-backup-preview-' + [guid]::NewGuid())
$preview = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $helper -OutputDirectory $previewTarget 2>&1
if ($LASTEXITCODE -ne 0 -or ($preview -join "`n") -notmatch 'PREVIEW ONLY') { throw 'Preview must succeed without credentials.' }
if (Test-Path -LiteralPath $previewTarget) { throw 'Preview unexpectedly created files.' }

$ErrorActionPreference = 'Continue'
$blocked = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $helper -OutputDirectory (Join-Path $repoRoot 'backups') 2>&1
$blockedExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($blockedExitCode -eq 0 -or ($blocked -join "`n") -notmatch 'outside the repository') { throw 'Repository output must be rejected.' }

foreach ($path in @('.env.backup-secret', 'backups/schema.sql', 'storage-backups/private-build.zip', 'data.sql', 'private.dump')) {
    & git -C $repoRoot check-ignore --no-index --quiet -- $path
    if ($LASTEXITCODE -ne 0) { throw 'A backup or secret path is not ignored.' }
}
foreach ($file in Get-ChildItem -LiteralPath (Join-Path $repoRoot 'supabase/migrations') -Filter '*.sql') {
    & git -C $repoRoot check-ignore --no-index --quiet -- ('supabase/migrations/' + $file.Name)
    if ($LASTEXITCODE -ne 1) { throw 'A planned migration is unexpectedly ignored.' }
}
Write-Output 'PASS: backup helper parses, preview reads no credentials and writes no files, repository output is refused, private artifacts are ignored, migrations remain trackable. No database connection was made.'
