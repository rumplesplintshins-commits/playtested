[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$PackageDirectory,
    [Parameter(Mandatory=$true)][string]$ArchivePath,
    [switch]$Execute
)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot $(if ((Split-Path -Leaf $PSScriptRoot) -in @('recovery','maintenance')) {'..\..'} else {'..'}))).TrimEnd('\')
$package=[IO.Path]::GetFullPath($PackageDirectory).TrimEnd('\')
$archive=[IO.Path]::GetFullPath($ArchivePath)
foreach($target in @($package,$archive)) {
    if($target.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or $target.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Keep the recovery package and encrypted archive outside the repository.' }
}
if($archive.StartsWith($package+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Archive must be outside the package directory.' }
if([IO.Path]::GetExtension($archive) -ne '.7z') { throw 'Use a .7z archive for AES-256 and encrypted filenames.' }
$seven=Join-Path $repo '.backup-tools\7zip-26.05\x64\7za.exe'
if(-not(Test-Path -LiteralPath $seven)) { throw 'Verified portable 7-Zip is missing.' }
if(-not(Test-Path -LiteralPath (Join-Path $package 'package-manifest.json'))) { throw 'Prepared package manifest is required.' }
if(Test-Path -LiteralPath $archive) { throw 'Choose a new archive path; existing archives will not be updated or overwritten.' }
if(-not $Execute) { Write-Output 'PREVIEW: AES-256 .7z with encrypted headers; password entered only at native 7-Zip prompts. No archive created.'; return }
New-Item -ItemType Directory -Path (Split-Path -Parent $archive) -Force | Out-Null
Write-Output 'Enter a new strong archive password directly at the hidden 7-Zip prompts. Save it separately in your password manager. Do not paste it into chat or append it to a command.'
Push-Location $package
try {
    # Bare -p prompts privately. No password variable, argument, history entry or file.
    & $seven a -t7z -mhe=on -p -mx=5 $archive '.\*'
    if($LASTEXITCODE -ne 0) { throw 'Archive creation failed. Retain any partial archive as incomplete.' }
} finally { Pop-Location }
Write-Output 'Now re-enter the password to independently test the encrypted archive.'
& $seven t $archive
if($LASTEXITCODE -ne 0) { throw 'Encrypted archive test failed; do not upload it as a verified backup.' }
$wrongPassword=[Guid]::NewGuid().ToString('N')
try { $ErrorActionPreference='Continue'; $listing=(& $seven l -slt ('-p'+$wrongPassword) $archive 2>&1 | Out-String); $listingExit=$LASTEXITCODE } finally { $ErrorActionPreference='Stop'; $wrongPassword=$null; $listing=$null }
if($listingExit -eq 0) { throw 'Archive filenames could be listed without the chosen password. Header encryption was not verified; do not upload.' }
$hash=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
$record=@{created_at_utc=[DateTime]::UtcNow.ToString('o');archive_name=[IO.Path]::GetFileName($archive);sha256=$hash;bytes=(Get-Item -LiteralPath $archive).Length;format='7z';encryption='AES-256';encrypted_filenames_requested=$true;encrypted_filenames_verified=$true;local_archive_test_passed=$true;offsite_roundtrip_verified=$false;package_manifest_sha256=(Get-FileHash -LiteralPath (Join-Path $package 'package-manifest.json') -Algorithm SHA256).Hash}
$record | ConvertTo-Json | Set-Content -LiteralPath ($archive+'.verification.json') -Encoding UTF8
Write-Output "Encrypted archive tested successfully. SHA-256: $hash"
Write-Output "Upload only $archive to your cloud storage, then download it to a DIFFERENT local directory. Keep the verification JSON locally for comparison; store the password separately. Off-site verification is still pending."
