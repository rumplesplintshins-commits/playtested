param(
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\', '/')
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

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) { throw 'Install Supabase CLI and its documented prerequisites first.' }
if (Test-Path -LiteralPath $backupRoot) { throw 'Use a new, unused backup directory; existing files will not be overwritten.' }
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
        # Discard CLI diagnostics rather than risk printing connection details.
        try { & supabase @dumpArgs *> $null } catch { throw 'Export failed. Artifacts are incomplete; do not treat them as a recovery point.' }
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $filePath) -or (Get-Item -LiteralPath $filePath).Length -eq 0) {
            throw ('Export stage failed: ' + $stage.File + '. Do not use partial exports as a recovery point.')
        }
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
