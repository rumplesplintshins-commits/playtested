[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$DownloadedArchive,
    [Parameter(Mandatory=$true)][string]$VerificationRecord,
    [Parameter(Mandatory=$true)][string]$ExtractDirectory
)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot $(if ((Split-Path -Leaf $PSScriptRoot) -in @('recovery','maintenance')) {'..\..'} else {'..'}))).TrimEnd('\')
$extract=[IO.Path]::GetFullPath($ExtractDirectory).TrimEnd('\')
$archive=[IO.Path]::GetFullPath($DownloadedArchive)
foreach($target in @($extract,$archive)) { if($target.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or $target.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Keep off-site recovery verification outside the repository.' } }
if(Test-Path -LiteralPath $extract) { throw 'Choose an unused extraction directory.' }
$record=Get-Content -LiteralPath $VerificationRecord -Raw | ConvertFrom-Json
if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $record.sha256) { throw 'Downloaded archive SHA-256 does not match the locally verified original.' }
$seven=Join-Path $repo '.backup-tools\7zip-26.05\x64\7za.exe'
Write-Output 'Downloaded ciphertext hash matches. Enter the archive password privately at the 7-Zip prompt to extract and verify the recovered files.'
& $seven x $archive ('-o'+$extract)
if($LASTEXITCODE -ne 0) { throw 'Downloaded archive extraction failed; recovery is not verified.' }
$manifestPath=Join-Path $extract 'package-manifest.json'
if((Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash -ne $record.package_manifest_sha256) { throw 'Recovered package manifest does not match the original.' }
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
foreach($entry in $manifest.files) {
    $file=[IO.Path]::GetFullPath((Join-Path $extract $entry.path))
    if(-not $file.StartsWith($extract+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe path in recovered manifest.' }
    if(-not(Test-Path -LiteralPath $file -PathType Leaf)) { throw 'Recovered package is missing a file.' }
    if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entry.sha256) { throw 'Recovered file hash mismatch.' }
}
if(@(Get-ChildItem -LiteralPath $extract -File -Recurse).Count -ne @($manifest.files).Count+1) { throw 'Unexpected file count in recovered package.' }
@{verified_at_utc=[DateTime]::UtcNow.ToString('o');archive_sha256=$record.sha256;package_manifest_sha256=$record.package_manifest_sha256;verified_files=@($manifest.files).Count;downloaded_archive=$archive;offsite_origin='User must attest this file was downloaded from their cloud upload';decryption_and_file_hashes_verified=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path (Split-Path -Parent $extract) ([IO.Path]::GetFileName($extract)+'-verification.json')) -Encoding UTF8
Write-Output ('PASS: downloaded archive hash, decryption, package manifest and all '+@($manifest.files).Count+' recovered file hashes verified. Keep the off-site copy and password separately.')
