param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot $(if ((Split-Path -Leaf $PSScriptRoot) -in @('recovery','maintenance')) {'..\..'} else {'..'}))).TrimEnd('\', '/')
$backupRoot = [IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\', '/')
if ($backupRoot.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $backupRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Choose a private output directory outside the repository.'
}

if (-not $Execute) {
    Write-Output 'PREVIEW ONLY: no connection, credentials, files or database changes.'
    Write-Output 'Prepared: supabase db dump --db-url <secure local input> --role-only -f <private directory>/roles.sql'
    Write-Output 'Prepared: supabase db dump --db-url <secure local input> -f <private directory>/schema.sql'
    Write-Output 'Prepared: supabase db dump --db-url <secure local input> --use-copy --data-only -x storage.buckets_vectors -x storage.vector_indexes -f <private directory>/data.sql'
    Write-Output 'Storage objects, managed-schema customisations and restore verification remain separate.'
    return
}

if (Test-Path -LiteralPath $backupRoot) { throw 'Use a new, unused backup directory; existing files will not be overwritten.' }
& (Join-Path $PSScriptRoot 'check-backup-readiness.ps1') -RequireReady
# Credentials are requested only interactively, never as a script argument/file.
# Supabase CLI still receives the URL in process arguments on this trusted machine.
$secureUrl = Read-Host 'Enter the existing source DB connection URL privately (hidden; never paste it into chat)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
$connectionUrl = $null
try {
    $connectionUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($connectionUrl -notmatch '^postgres(ql)?://') { throw 'A database connection URL is required.' }
    New-Item -ItemType Directory -Path $backupRoot | Out-Null
    $startedAt = [DateTime]::UtcNow.ToString('o')
    $stages = @(
        @{ File = 'roles.sql'; Options = @('--role-only') },
        @{ File = 'schema.sql'; Options = @() },
        @{ File = 'data.sql'; Options = @('--use-copy', '--data-only', '-x', 'storage.buckets_vectors', '-x', 'storage.vector_indexes') }
    )
    foreach ($stage in $stages) {
        $filePath = Join-Path $backupRoot $stage.File
        $dumpArgs = @('db', 'dump', '--db-url', $connectionUrl, '-f', $filePath) + $stage.Options
        # Windows PowerShell can turn normal native stderr progress into a terminating
        # error under Stop. Capture it privately and judge success by the exit code.
        $diagnostics = $null
        $stageExitCode = -1
        try {
            $ErrorActionPreference = 'Continue'
            $diagnostics = (& supabase @dumpArgs 2>&1 | Out-String)
            $stageExitCode = $LASTEXITCODE
        } catch {
            $diagnostics = $_.Exception.Message
        } finally { $ErrorActionPreference = 'Stop' }
        if ($stageExitCode -ne 0 -or -not (Test-Path -LiteralPath $filePath) -or (Get-Item -LiteralPath $filePath).Length -eq 0) {
            # Only fixed categories may leave memory; never echo raw diagnostics.
            $category = 'Unclassified CLI failure'
            if ($diagnostics -match 'password authentication failed|SASL authentication failed') { $category = 'Database authentication failed' }
            elseif ($diagnostics -match 'no such host|could not translate host name|Name or service not known') { $category = 'Database hostname resolution failed' }
            elseif ($diagnostics -match 'network is unreachable|connection timed out|connection refused') { $category = 'Database network connection failed' }
            elseif ($diagnostics -match 'error during connect|Cannot connect to the Docker daemon|docker_engine') { $category = 'Docker connection failed' }
            elseif ($diagnostics -match 'pull access denied|failed to resolve reference|error pulling image') { $category = 'Docker image download failed' }
            elseif ($diagnostics -match 'telemetry.json|EPERM|Access is denied') { $category = 'Local file access failed' }
            $diagnostics = $null
            throw ('Export stage failed: ' + $stage.File + '. ' + $category + ' (exit ' + $stageExitCode + '). Artifacts are incomplete.')
        }
        $diagnostics = $null
    }
    $files = foreach ($stage in $stages) {
        $filePath = Join-Path $backupRoot $stage.File
        @{ name = $stage.File; bytes = (Get-Item -LiteralPath $filePath).Length; sha256 = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash }
    }
    $migrationHashes = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'supabase/migrations') -Filter '*.sql' | Sort-Object Name | ForEach-Object {
        @{ name = $_.Name; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    }
    @{
        started_at_utc = $startedAt; completed_at_utc = [DateTime]::UtcNow.ToString('o')
        export_files = @($files); planned_migrations = @($migrationHashes)
        common_snapshot_verified = $false; storage_objects_verified = $false
        managed_schema_customisations_verified = $false; restore_verified = $false
        production_application_authorised = $false
    } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backupRoot 'manifest.json') -Encoding UTF8
    Write-Output 'Export files and integrity manifest saved privately. A verified recovery point still requires coverage checks, an off-site copy and an isolated restore test.'
} finally {
    $connectionUrl = $null
    $dumpArgs = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secureUrl.Dispose()
}
