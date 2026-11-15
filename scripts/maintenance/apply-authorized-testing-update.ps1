[CmdletBinding()]
param([switch]$Execute, [switch]$GenreUpdate, [switch]$DeveloperLaunchUpdate, [switch]$DiscoveryUpdate, [switch]$AudienceUpdate, [switch]$SubmissionCorrectionsUpdate)
if(@($GenreUpdate,$DeveloperLaunchUpdate,$DiscoveryUpdate,$AudienceUpdate,$SubmissionCorrectionsUpdate).Where({$_}).Count -gt 1){throw 'Choose only one update.'}

# Authorized scoped updates: original five, canonical genres, or developer-wide launch limit.
# No restore, credential reset, deployment, Git operation or recovery supplement.
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot $(if ((Split-Path -Leaf $PSScriptRoot) -in @('recovery','maintenance')) {'..\..'} else {'..'})))
$release=Get-Content (Join-Path $repo 'docs\rehearsal-source-manifest.json') -Raw|ConvertFrom-Json
$expected=@(
    @{name='202610280001_testing_policy.sql';sha256='6ec4385a9403348860918f2ed53f437f4c3fa50694db27342c06ec933c26535a'},
    @{name='202610280002_workflow_integration.sql';sha256='c44816d26dbf2182af062a80b278d3949756cfd498fe5cbf0dc3d5f4384da1a9'},
    @{name='202610280003_testing_read_models.sql';sha256='0270f3e16fb8c41a16f654aa4bff329813e20b6e46ceb8a566fcad88ba7cd28b'},
    @{name='202610280004_claim_integrity.sql';sha256='7154d80d3dfe2829bb9877a9f2060722d129b924e606c99d31058d8d19ccebf5'},
    @{name='202610280005_developer_quality_signals.sql';sha256='9155e3e7b9031bea41c8e5f7d538f7b2b6c89b2c71bc326a3790fcf7c81c9f80'}
)
if($GenreUpdate) {
    $expected=@(@{name='202610280006_canonical_testing_genres.sql';sha256='600c8dbdcb977a9df2083bb29f0367b55adb638a55893d7ca3a74fb8343d9ce9'})
}
if($DeveloperLaunchUpdate) {
    $expected=@(@{name='202610280007_developer_launch_allowance.sql';sha256='d527caf7351bf9423a79f27a505c93eb765f042e42fe89769bc54d2811cfe482'})
}
if($DiscoveryUpdate) {
    $expected=@(@{name='202610280008_testing_discovery.sql';sha256='d769b0254cc9ffd82723e55bc0e2aa48ff0718b0875003dacb9fd586682e746a'})
}
if($AudienceUpdate) {
    $expected=@(@{name='202610280009_testing_audience_availability.sql';sha256='59e6fabb71239c9d17970b66e843e8047de581b9c31ffaf17f3ed2434cef76ec'})
}
if($SubmissionCorrectionsUpdate) {
    $expected=@(@{name='202610280010_submission_corrections.sql';sha256='76bd90bc4fdb59d1f2ef40005fa3338610c937eab7cfe02c7bdc281b1d29a0c4'})
}
foreach($file in $expected) { if((Get-FileHash (Join-Path $repo ('supabase\migrations\'+$file.name)) -Algorithm SHA256).Hash -ne $file.sha256) { throw ('Migration hash changed: '+$file.name) } }
if(-not $GenreUpdate -and -not $DeveloperLaunchUpdate -and -not $DiscoveryUpdate -and -not $AudienceUpdate -and -not $SubmissionCorrectionsUpdate) {
    foreach($file in $release.tested_files) { if(-not(Test-Path -LiteralPath (Join-Path $repo $file.path)) -or (Get-FileHash -LiteralPath (Join-Path $repo $file.path) -Algorithm SHA256).Hash -ne $file.working_tree_sha256) { throw ('Application differs from rehearsed source: '+$file.path) } }
}
if(-not $Execute) { Write-Output ('PREVIEW: '+$expected.Count+' pinned migration(s), source project qtcmzckdhgahuqqilmzj, stop on any failure. No connection or changes.'); $expected|ForEach-Object{Write-Output $_.name}; return }
$docker=(Get-Command docker -ErrorAction SilentlyContinue).Source
if(-not $docker) { foreach($p in @("$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe",'C:\Program Files\Docker\Docker\resources\bin\docker.exe')) { if(Test-Path $p) { $docker=$p;break } } }
if(-not $docker) { throw 'Docker executable missing.' }
$archive='C:\PrivateBackups\Playtested-Recovery-20261028-r2.7z'
if(-not(Test-Path $archive) -or (Get-FileHash $archive -Algorithm SHA256).Hash -ne '78B3A2D496AC1545B224ED2A1FEA3ECEC43DD67B8C411A206CD4F7339C695C9D') { throw 'Verified recovery archive is missing or changed.' }
$secure=Read-Host 'Existing source Session pooler URI (hidden; never paste into chat)' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$names=@('PGHOST','PGPORT','PGUSER','PGDATABASE','PGPASSWORD','PGSSLMODE','PGOPTIONS')
$saved=@{};foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$record=$null;$output=$null
function Invoke-SourceFile([string]$file) {
    $dockerArgs=@('run','--rm','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user=postgres','--network=bridge','--entrypoint=psql')
    foreach($n in $names){$dockerArgs+=@('--env',$n)}
    $dockerArgs+=@('--mount',('type=bind,source='+$file+',target=/operation.sql,readonly'),'public.ecr.aws/supabase/postgres:17.11.0.006','-X','-qAt','--set=ON_ERROR_STOP=1','--file=/operation.sql')
    try { $ErrorActionPreference='Continue';$diagnostic=(& $docker @dockerArgs 2>&1|Out-String);$code=$LASTEXITCODE } finally { $ErrorActionPreference='Stop' }
    return @{code=$code;text=$diagnostic}
}
function Save-Record { $record|ConvertTo-Json -Depth 8|Set-Content (Join-Path $output 'migration-record.json') -Encoding UTF8 }
try {
    $raw=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr);$uri=$null
    if(-not[Uri]::TryCreate($raw,[UriKind]::Absolute,[ref]$uri) -or $uri.Scheme -notin @('postgres','postgresql')) { throw 'A PostgreSQL URI is required.' }
    $parts=$uri.UserInfo.Split(':',2)
    if($parts.Count -ne 2){throw 'Existing database credentials are required.'}
    $env:PGHOST=$uri.Host;$env:PGPORT=$(if($uri.Port -gt 0){[string]$uri.Port}else{'5432'});$env:PGUSER=[Uri]::UnescapeDataString($parts[0]);$env:PGPASSWORD=[Uri]::UnescapeDataString($parts[1]);$env:PGDATABASE=$uri.AbsolutePath.TrimStart('/')
    if($env:PGPORT -ne '5432' -or $env:PGDATABASE -ne 'postgres' -or $env:PGHOST -notmatch '\.pooler\.supabase\.com$' -or $env:PGUSER -ne 'postgres.qtcmzckdhgahuqqilmzj') { throw 'Use the approved project Session pooler URI on port 5432.' }
    $env:PGSSLMODE='require';$env:PGOPTIONS='-c lock_timeout=15000 -c statement_timeout=300000'
    $output=Join-Path 'C:\PrivateBackups\Playtested' ($(if($SubmissionCorrectionsUpdate){'authorized-submission-corrections-'}elseif($AudienceUpdate){'authorized-audience-update-'}elseif($DiscoveryUpdate){'authorized-discovery-update-'}elseif($DeveloperLaunchUpdate){'authorized-developer-launch-update-'}elseif($GenreUpdate){'authorized-genre-update-'}else{'authorized-update-'})+(Get-Date -Format 'yyyyMMdd-HHmmss'))
    if(Test-Path $output){throw 'Execution record directory exists.'};New-Item -ItemType Directory $output|Out-Null
    $record=@{project_ref='qtcmzckdhgahuqqilmzj';started_at_utc=[DateTime]::UtcNow.ToString('o');application_manifest_sha256=$release.content_manifest_sha256;git_head=$release.git_head;status='preflight';migrations=@()};Save-Record
    if($GenreUpdate -or $DeveloperLaunchUpdate -or $DiscoveryUpdate -or $AudienceUpdate -or $SubmissionCorrectionsUpdate) {
        $record.application_manifest_sha256=$null
        $record.application_files=@('lib\genres.ts','app\components\TestingPolicy.tsx','app\components\CampaignAudienceFields.tsx','app\components\StartPlaytest.tsx','app\tester\page.tsx','app\submit\page.tsx')|ForEach-Object{@{path=$_;sha256=(Get-FileHash -LiteralPath (Join-Path $repo $_) -Algorithm SHA256).Hash}}
        Save-Record
    }
    if($SubmissionCorrectionsUpdate) {
        $record.application_files=@('lib\submission-completeness.ts','app\submit\page.tsx','app\components\SubmissionCorrection.tsx','app\components\SubmissionCompletenessBatch.tsx','app\admin\submissions\page.tsx','app\my-submissions\page.tsx','app\components\DeveloperWorkspace.tsx','app\components\StartPlaytest.tsx')|ForEach-Object{@{path=$_;sha256=(Get-FileHash -LiteralPath (Join-Path $repo $_) -Algorithm SHA256).Hash}}
        Save-Record
    }
    $preflight=Join-Path $output 'preflight.sql'
    @'
begin read only;
select json_build_object('ready',to_regclass('public.profiles') is not null and to_regclass('public.community_game_tests') is not null and to_regclass('public.testing_policy') is null and to_regprocedure('public.get_my_testing_progress()') is null,'version',current_setting('server_version'));
commit;
'@ | Set-Content $preflight -Encoding UTF8
    if($GenreUpdate) {
        "begin read only; select json_build_object('ready',to_regclass('public.testing_policy') is not null and to_regprocedure('public.get_my_testing_progress()') is not null and to_regprocedure('public.game_genres(text)') is null,'version',current_setting('server_version')); commit;" | Set-Content $preflight -Encoding UTF8
    }
    if($DeveloperLaunchUpdate) {
        "begin read only; select json_build_object('ready',to_regprocedure('public.game_genres(text)') is not null and to_regprocedure('public._playtested_developer_launch_window_at(uuid,timestamp with time zone)') is null,'version',current_setting('server_version')); commit;" | Set-Content $preflight -Encoding UTF8
    }
    if($DiscoveryUpdate) {
        "begin read only; select json_build_object('ready',to_regprocedure('public.game_genres(text)') is not null and to_regprocedure('public.get_discoverable_community_test_games()') is null,'version',current_setting('server_version')); commit;" | Set-Content $preflight -Encoding UTF8
    }
    if($AudienceUpdate) {
        "begin read only; select json_build_object('ready',to_regprocedure('public.game_genres(text)') is not null and to_regprocedure('public.get_testing_audience_availability(integer,text,boolean)') is null,'version',current_setting('server_version')); commit;" | Set-Content $preflight -Encoding UTF8
    }
    if($SubmissionCorrectionsUpdate) {
        "begin read only; select json_build_object('ready',to_regclass('public.game_submissions') is not null and to_regprocedure('public.review_game_submission(uuid,text,text)') is not null and to_regprocedure('public.submission_completeness(jsonb)') is null,'version',current_setting('server_version')); commit;" | Set-Content $preflight -Encoding UTF8
    }
    $result=Invoke-SourceFile $preflight
    if($result.code -ne 0){$result.text|Set-Content (Join-Path $output 'preflight-private.log');throw 'Source preflight failed; no migrations applied.'}
    $state=$result.text|ConvertFrom-Json
    if(-not $state.ready -or $state.version -notmatch '^17\.'){throw 'Source is not in the expected pre-update state. Stop; do not rerun migrations blindly.'}
    $driftFile=Join-Path $repo 'supabase\inspection\rollout-drift-audit.sql'
    $before=Invoke-SourceFile $driftFile
    if($before.code -ne 0){$before.text|Set-Content (Join-Path $output 'before-private.log');throw 'Before-migration read-only capture failed; no migrations applied.'}
    $before.text|Set-Content (Join-Path $output 'before-data-fingerprints.json') -Encoding UTF8
    foreach($migration in $expected) {
        Write-Output ('Applying '+$migration.name)
        $result=Invoke-SourceFile (Join-Path $repo ('supabase\migrations\'+$migration.name))
        $result.text|Set-Content (Join-Path $output ($migration.name+'.private.log')) -Encoding UTF8
        $record.migrations+=@{name=$migration.name;sha256=$migration.sha256;completed_at_utc=[DateTime]::UtcNow.ToString('o');exit_code=$result.code};Save-Record
        if($result.code -ne 0){throw ('STOP: '+$migration.name+' failed. Prior successes remain committed; do not rerun them. Private diagnostics: '+$output)}
        Write-Output ('Committed '+$migration.name)
    }
    $record.status='all-requested-committed';Save-Record
    $after=Invoke-SourceFile $driftFile
    if($after.code -ne 0){throw 'Requested migrations committed; post-update read-only capture failed. Do not reapply migrations.'}
    $after.text|Set-Content (Join-Path $output 'after-data-fingerprints.json') -Encoding UTF8
    $b=($before.text|ConvertFrom-Json).tables;$a=($after.text|ConvertFrom-Json).tables
    $differences=@($b|Where-Object{$old=$_;$new=$a|Where-Object table -eq $old.table; -not $new -or $old.rows -ne $new.rows -or $old.rows_sha256 -ne $new.rows_sha256})
    $record.original_table_fingerprint_differences=$differences.Count;$record.completed_at_utc=[DateTime]::UtcNow.ToString('o');$record.status='completed';Save-Record
    Write-Output ('SUCCESS: '+$expected.Count+' migration(s) committed. '+$differences.Count+' original-table fingerprint differences. Record: '+$output)
    if($differences.Count){Write-Output 'Data changed during capture/update; review before proceeding. Concurrent legitimate writes may cause differences. Do not restore or rerun automatically.'}
} catch {
    if($record){$record.status='stopped';$record.failure_at_utc=[DateTime]::UtcNow.ToString('o');Save-Record}
    throw
} finally {
    foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
    $raw=$null;$uri=$null;$parts=$null;$result=$null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr);$secure.Dispose()
}
