param(
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [string]$PostgresBin='C:\Program Files\PostgreSQL\17\bin',
    [switch]$Execute
)
function ConvertFrom-M261ConnectionUrl {
    param([AllowNull()][AllowEmptyString()][string]$ConnectionText)
    $invalid='Enter a complete PostgreSQL connection URL with a username and password. Percent-encode reserved password characters; do not include surrounding quotes.'
    if([string]::IsNullOrWhiteSpace($ConnectionText)){throw 'No connection URL entered. Nothing was exported.'}
    $text=$ConnectionText.Trim()
    [Uri]$parsed=$null
    if($text -match '\s|%(?![0-9a-fA-F]{2})' -or -not [Uri]::TryCreate($text,[UriKind]::Absolute,[ref]$parsed) -or $null -eq $parsed){throw $invalid}
    if($parsed.Scheme -notin @('postgres','postgresql') -or [string]::IsNullOrWhiteSpace($parsed.Host) -or $parsed.Fragment){throw $invalid}
    $info=$parsed.UserInfo
    if([string]::IsNullOrEmpty($info) -or $info -match '%(?![0-9a-fA-F]{2})'){throw $invalid}
    # Split at the first literal colon explicitly; avoid PowerShell5.1 overload binding.
    $separator=$info.IndexOf([char]':')
    if($separator -le 0 -or $separator -ge ($info.Length-1)){throw $invalid}
    $username=[Uri]::UnescapeDataString($info.Substring(0,$separator))
    $password=[Uri]::UnescapeDataString($info.Substring($separator+1))
    if([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrEmpty($password) -or $username -match '[\x00-\x1f\x7f]' -or $password -match '[\x00-\x1f\x7f]'){throw $invalid}
    $database=[Uri]::UnescapeDataString($parsed.AbsolutePath.TrimStart('/'))
    $port=if($parsed.Port -gt 0){$parsed.Port}else{5432}
    $direct=$parsed.Host -eq 'db.qtcmzckdhgahuqqilmzj.supabase.co' -and $username -eq 'postgres'
    $session=$parsed.Host.EndsWith('.pooler.supabase.com') -and $username -eq 'postgres.qtcmzckdhgahuqqilmzj'
    if((-not($direct -or $session)) -or $port -ne 5432 -or $database -ne 'postgres'){throw 'Wrong production project, database or pooling mode. Use direct/session port5432.'}
    return @{Host=$parsed.Host;Port=$port;Username=$username;Password=$password;Database=$database}
}
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\')
$destination=[IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')
if($destination.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or $destination.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Use a new private directory outside this repository.'}
if(Test-Path -LiteralPath $destination){throw 'Destination exists; nothing will be overwritten.'}
foreach($tool in @('psql.exe','pg_dump.exe','pg_dumpall.exe','pg_restore.exe')){if(-not(Test-Path -LiteralPath (Join-Path $PostgresBin $tool))){throw ('Missing PostgreSQL tool: '+$tool)}}
if(-not $Execute){Write-Output 'Preview: hidden existing production connection, read-only source probe, consistent custom export, password-free roles, archive list/full decode and coverage manifest. No files, credentials or connections accessed.';return}
$secret=$null;$pointer=[IntPtr]::Zero;$connection=$null;$connectionText=$null
$names=@('PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE','PGOPTIONS','PGAPPNAME','PGCONNECT_TIMEOUT','PGSERVICE','PGSERVICEFILE','PGPASSFILE')
$saved=@{};foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
try{
    $secret=Read-Host 'Existing production PostgreSQL connection URL (hidden; do not paste into chat)' -AsSecureString
    if($null -eq $secret -or $secret -isnot [Security.SecureString] -or $secret.Length -eq 0){throw 'No connection URL entered. Nothing was exported.'}
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $connectionText=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $connection=ConvertFrom-M261ConnectionUrl -ConnectionText $connectionText
    $connectionText=$null
    foreach($name in @('PGSERVICE','PGSERVICEFILE','PGPASSFILE')){[Environment]::SetEnvironmentVariable($name,$null,'Process')}
    $env:PGHOST=$connection.Host;$env:PGPORT=[string]$connection.Port;$env:PGUSER=$connection.Username;$env:PGPASSWORD=$connection.Password;$env:PGDATABASE=$connection.Database
    $env:PGSSLMODE='require';$env:PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=0';$env:PGAPPNAME='m261-readonly-recovery-export';$env:PGCONNECT_TIMEOUT='15'
    New-Item -ItemType Directory -Path $destination | Out-Null
    $acl=Get-Acl -LiteralPath $destination;$acl.SetAccessRuleProtection($true,$false)
    foreach($principal in @([Security.Principal.WindowsIdentity]::GetCurrent().Name,'NT AUTHORITY\SYSTEM','BUILTIN\Administrators')){$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($principal,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))}
    Set-Acl -LiteralPath $destination -AclObject $acl
    $started=[DateTime]::UtcNow.ToString('o')
    # Native stderr is private; judge exit codes rather than PowerShell stderr records.
    $ErrorActionPreference='Continue'
    $probe=& (Join-Path $PostgresBin 'psql.exe') -X -w -qAt --set=ON_ERROR_STOP=1 --command "select json_build_object('read_only',current_setting('transaction_read_only'),'server_version',current_setting('server_version_num'),'listing_controls',to_regclass('public.listing_controls') is not null,'migrations',to_regclass('supabase_migrations.schema_migrations') is not null)" 2> (Join-Path $destination 'probe-private.log')
    $exit=$LASTEXITCODE;$ErrorActionPreference='Stop'
    if($exit -ne 0){throw 'Read-only connection probe failed. Private diagnostics retained; no export completed.'}
    $source=($probe -join '') | ConvertFrom-Json
    if($source.read_only -ne 'on' -or -not $source.listing_controls -or -not $source.migrations -or [int]$source.server_version -lt 170000 -or [int]$source.server_version -ge 180000){throw 'Unexpected source baseline/version; stop for review.'}
    $dump=Join-Path $destination 'database.dump';$roles=Join-Path $destination 'roles.sql'
    $ErrorActionPreference='Continue'
    & (Join-Path $PostgresBin 'pg_dump.exe') --no-password --format=custom --file=$dump 2> (Join-Path $destination 'dump-private.log')
    $exit=$LASTEXITCODE;$ErrorActionPreference='Stop';if($exit -ne 0){throw 'Database export failed; directory is incomplete.'}
    $ErrorActionPreference='Continue'
    & (Join-Path $PostgresBin 'pg_dumpall.exe') --no-password --roles-only --no-role-passwords --file=$roles 2> (Join-Path $destination 'roles-private.log')
    $exit=$LASTEXITCODE;$ErrorActionPreference='Stop';if($exit -ne 0){throw 'Role export failed; recovery package is incomplete.'}
    $ErrorActionPreference='Continue'
    $toc=& (Join-Path $PostgresBin 'pg_restore.exe') --list $dump 2> (Join-Path $destination 'list-private.log')
    $exit=$LASTEXITCODE;$ErrorActionPreference='Stop';if($exit -ne 0){throw 'Archive list verification failed.'}
    [IO.File]::WriteAllLines((Join-Path $destination 'toc-private.txt'),[string[]]$toc)
    $missing=@();foreach($entry in @('public listing_controls','supabase_migrations schema_migrations','auth users','auth identities','storage buckets','storage objects','public profiles','public game_submissions','public imported_games','public community_game_tests','public community_playtests')){if(-not(($toc -join "`n") -match ('TABLE DATA '+[regex]::Escape($entry)+'(?:\s|$)'))){$missing+=$entry}}
    if($missing.Count){throw 'Archive lacks required current table-data coverage; inspect private TOC. Do not release.'}
    $ErrorActionPreference='Continue'
    & (Join-Path $PostgresBin 'pg_restore.exe') --file=NUL $dump 2> (Join-Path $destination 'decode-private.log')
    $exit=$LASTEXITCODE;$ErrorActionPreference='Stop';if($exit -ne 0){throw 'Full compressed-block decode failed.'}
    $files=@();foreach($file in @($dump,$roles)){if((Get-Item -LiteralPath $file).Length -eq 0){throw 'Empty archive component.'};$files+=@{name=(Split-Path $file -Leaf);bytes=(Get-Item -LiteralPath $file).Length;sha256=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()}}
    @{project='qtcmzckdhgahuqqilmzj';started_at=$started;completed_at=[DateTime]::UtcNow.ToString('o');source_read_only=$true;source_server_version=$source.server_version;database_consistent_pg_dump_snapshot=$true;roles_same_snapshot=$false;files=$files;required_table_data_coverage=$true;archive_list_verified=$true;full_decode_verified=$true;isolated_restore='Not Run';storage_bytes_included=$false;whole_service_atomic_snapshot=$false;release_authorized=$false} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'verification.json') -Encoding UTF8
    Write-Output 'Export/list/full decode/required coverage completed. Protected verification.json contains hashes. Independent verification and any agreed isolated restoration remain necessary; this does not authorize release.'
}finally{
    foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
    $connection=$null;$connectionText=$null;$probe=$null
    if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
    if($secret -is [Security.SecureString]){$secret.Dispose()}
}
