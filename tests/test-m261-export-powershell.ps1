$ErrorActionPreference='Stop'
$main=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\scripts\recovery\export-m261-database.ps1'))
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile($main,[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'Export script syntax failure'}
$definition=$ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'ConvertFrom-M261ConnectionUrl'},$false)
. ([ScriptBlock]::Create($definition.Extent.Text))
function Assert([bool]$Condition,[string]$Message){if(-not $Condition){throw $Message}}
$base='postgresql://postgres.qtcmzckdhgahuqqilmzj:'
$suffix='@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
$valid=$base+'dummy%3A%40%2F%23%25'+$suffix+'?sslmode=require'
$parsed=ConvertFrom-M261ConnectionUrl $valid
Assert ($parsed.Password -eq 'dummy:@/#%') 'Encoded password changed'
Assert ($parsed.Port -eq 5432 -and $parsed.Database -eq 'postgres') 'Session pooler parsing failed'
$parsed=ConvertFrom-M261ConnectionUrl ('  '+$base+'dummy:with:colons'+$suffix+'  ')
Assert ($parsed.Password -eq 'dummy:with:colons') 'First-colon split lost password characters'
$parsed=ConvertFrom-M261ConnectionUrl 'postgres://postgres:dummy@db.qtcmzckdhgahuqqilmzj.supabase.co:5432/postgres'
Assert ($parsed.Username -eq 'postgres') 'Direct connection rejected'
$invalid=@($null,'','   ','not-a-url','relative/path',('"'+$valid+'"'),'postgresql://aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
 ($base+$suffix),('postgresql://:dummy'+$suffix),($base+'dummy%QZ'+$suffix),($base+'dummy%00'+$suffix),($base+'dummy#fragment'+$suffix),
 ($valid.Replace(':5432',':6543')),($valid.Replace('qtcmzckdhgahuqqilmzj','ktifgybnkdaotdxrvjgq')),($base+'dummy'+$suffix.Replace('/postgres','/other')),($valid.Replace('pooler.supabase.com','example.invalid')),
 ($valid.Replace('postgresql://','https://')),($valid.Replace(':5432',':65536')))
$caseIndex=0;foreach($value in $invalid){
 $caught=$false;try{$null=ConvertFrom-M261ConnectionUrl $value}catch{$caught=$true;Assert ($_.Exception.Message -notmatch 'dummy|postgresql://') 'Validation error exposed input';Assert ($_.FullyQualifiedErrorId -notmatch 'InvokeMethodOnNull') 'Null method error survived'}
 Assert $caught ('Invalid connection unexpectedly accepted at case '+$caseIndex);$caseIndex++
}
# Execute the actual entry point. Mock filesystem/tool presence, then abort before
# directory creation; no executable, network connection or backup write can run.
foreach($mode in @('valid','invalid','empty','null','cancel','existing-env')){
 & {
  param($mode,$main,$valid)
  $state=@{reached=$false;secret=$null}
  $names=@('PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE','PGOPTIONS','PGAPPNAME','PGCONNECT_TIMEOUT','PGSERVICE','PGSERVICEFILE','PGPASSFILE')
  $outer=@{};foreach($name in $names){$outer[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
  try{
  if($mode -eq 'existing-env'){$env:PGHOST='dummy-existing.invalid';$env:PGPASSWORD='dummy-existing-password';$env:PGSERVICE='dummy-existing-service'}
  $before=@{};foreach($name in $names){$before[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
  function Read-Host {
   if($mode -eq 'cancel'){throw 'dummy-prompt-cancelled'}
   if($mode -eq 'null'){return $null}
   $text=if($mode -in @('valid','existing-env')){$valid}elseif($mode -eq 'invalid'){'relative/path'}else{''}
   $state.secret=New-Object Security.SecureString
   foreach($character in $text.ToCharArray()){$state.secret.AppendChar($character)}
   return $state.secret
  }
  function Test-Path {param($LiteralPath) return ([string]$LiteralPath -match '\.exe$')}
  function New-Item {
   $state.reached=$true
   Assert ($env:PGHOST -eq 'aws-0-eu-west-1.pooler.supabase.com' -and $env:PGPASSWORD -eq 'dummy:@/#%') 'Entry-point parsing/env setup failed'
   throw 'test-stop-before-filesystem-or-network'
  }
  $message='';try{& $main -OutputDirectory (Join-Path ([IO.Path]::GetTempPath()) ('m261-no-create-'+[Guid]::NewGuid())) -PostgresBin 'C:\m261-no-real-tools' -Execute}catch{$message=$_.Exception.Message;Assert ($_.FullyQualifiedErrorId -notmatch 'InvokeMethodOnNull') 'Cleanup masked validation/cancellation'}
  Assert ($message.Length -gt 0) 'Expected controlled stop'
  Assert ($state.reached -eq ($mode -in @('valid','existing-env'))) 'Bad input reached filesystem boundary'
  if($mode -in @('valid','existing-env')){Assert ($message -eq 'test-stop-before-filesystem-or-network') 'Valid pooler did not reach controlled stop'}
  if($mode -eq 'cancel'){Assert ($message -eq 'dummy-prompt-cancelled') 'Cancellation was masked'}
  foreach($name in $names){Assert ([Environment]::GetEnvironmentVariable($name,'Process') -ceq $before[$name]) ('Environment not restored: '+$name)}
  if($null -ne $state.secret){$disposed=$false;try{$testPointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($state.secret);[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($testPointer)}catch{$disposed=$true};Assert $disposed 'SecureString was not disposed'}
  }finally{foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$outer[$name],'Process')}}
 } $mode $main $valid
}
Write-Output ('PASS Windows PowerShell '+$PSVersionTable.PSVersion+': session/direct parsing, encoded/colon passwords, '+$invalid.Count+' invalid cases, empty/null/cancel prompts, actual entry-point boundary, environment restoration and secret disposal. Dummy credentials only; no native tools, network or files used.')
