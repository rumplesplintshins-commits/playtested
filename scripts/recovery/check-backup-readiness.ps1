param([switch]$RequireReady)

$ErrorActionPreference = 'Stop'
# Local checks only. Never load project credentials or contact Supabase.
$exportReady = $true
foreach ($tool in @('supabase', 'docker')) {
    $available = [bool](Get-Command $tool -ErrorAction SilentlyContinue)
    Write-Output ($tool + ': ' + $(if ($available) { 'found' } else { 'missing' }))
    if (-not $available) { $exportReady = $false }
}
if (Get-Command docker -ErrorAction SilentlyContinue) {
    try {
        & docker info --format '{{.ServerVersion}}' *> $null
        $dockerReady = $LASTEXITCODE -eq 0
    } catch { $dockerReady = $false }
    Write-Output ('Docker engine: ' + $(if ($dockerReady) { 'reachable' } else { 'unavailable' }))
    if (-not $dockerReady) { $exportReady = $false }
}
Write-Output ('psql (restore rehearsal): ' + $(if (Get-Command psql -ErrorAction SilentlyContinue) { 'found' } else { 'missing' }))
Write-Output 'No credentials read, files created, services started or database connections made.'
if (-not $exportReady -and $RequireReady) {
    throw 'Export prerequisites unavailable. Install Supabase CLI and Docker, then start Docker privately before exporting.'
}
if ($exportReady) { Write-Output 'Local export prerequisites found; source access, disk space and recovery coverage remain unverified.' }
