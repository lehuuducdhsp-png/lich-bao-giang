Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Supabase backup script for Windows PowerShell 5.1+.
# ASCII-only source is intentional so Windows PowerShell 5.1 can parse it safely.
# NEVER store DB passwords, access tokens, service-role keys, or secret values here.

$ProjectRef = 'gmkibmybqfomypytmjxw'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutDir = Join-Path $BaseDir ("output\" + $Stamp)
$WorkDir = Join-Path $OutDir 'workdir'
$DbDir = Join-Path $OutDir 'database'
$StorageDir = Join-Path $OutDir 'storage'
$FunctionsDir = Join-Path $OutDir 'edge-functions'
$MetaDir = Join-Path $OutDir 'metadata'
$StatusFile = Join-Path $OutDir 'BACKUP_STATUS.txt'

$dirs = @($OutDir,$WorkDir,$DbDir,$StorageDir,$FunctionsDir,$MetaDir)
foreach($d in $dirs){ New-Item -ItemType Directory -Force -Path $d | Out-Null }

function Write-Status([string]$Text){
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Text"
  Write-Host $line
  Add-Content -Path $StatusFile -Value $line -Encoding UTF8
}

function Require-Command([string]$Name,[string]$HelpText){
  if(-not (Get-Command $Name -ErrorAction SilentlyContinue)){
    throw "Missing command '$Name'. $HelpText"
  }
}

function Run-Step([string]$Name,[scriptblock]$Action,[bool]$Critical=$true){
  Write-Status "START: $Name"
  try {
    $global:LASTEXITCODE = 0
    & $Action
    if($LASTEXITCODE -ne 0){ throw "Exit code $LASTEXITCODE" }
    Write-Status "OK: $Name"
    return $true
  } catch {
    Write-Status "ERROR: $Name - $($_.Exception.Message)"
    if($Critical){ throw }
    return $false
  }
}

@"
SUPABASE BACKUP - PRIVATE DATA
Project ref: $ProjectRef
Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')

WARNING:
- This folder may contain account data, password hashes, profiles, and private TKB files.
- DO NOT upload the output folder to a public GitHub repository.
- DO NOT share this backup with unauthorized people.
- Secret/service-role values are NOT automatically exported by this script.
"@ | Set-Content -Path (Join-Path $OutDir 'README-PRIVATE.txt') -Encoding UTF8

Require-Command 'supabase' 'Install Supabase CLI first.'
Require-Command 'docker' 'Install and start Docker Desktop first.'

Run-Step 'Docker engine check' { docker info | Out-Null }

try {
  $global:LASTEXITCODE = 0
  supabase projects list | Out-Null
  if($LASTEXITCODE -ne 0){ throw 'Supabase CLI is not logged in.' }
} catch {
  Write-Host ''
  Write-Host 'Supabase CLI login is required. The official login flow will start now.' -ForegroundColor Yellow
  supabase login
  if($LASTEXITCODE -ne 0){ throw 'Supabase CLI login failed.' }
}

Push-Location $WorkDir
try {
  if(-not (Test-Path (Join-Path $WorkDir 'supabase\config.toml'))){
    Run-Step 'Initialize temporary Supabase workdir' { supabase init }
  }

  Write-Host ''
  Write-Host 'Supabase may ask for the Database password during project linking.' -ForegroundColor Yellow
  Write-Host 'Enter it only in this terminal. Do not paste it into GitHub or chat.' -ForegroundColor Yellow
  Run-Step 'Link target Supabase project' { supabase link --project-ref $ProjectRef }

  # 1) MAIN DATABASE
  Run-Step 'Dump database roles' {
    supabase db dump --linked -f (Join-Path $DbDir 'roles.sql') --role-only
  }
  Run-Step 'Dump application schema' {
    supabase db dump --linked -f (Join-Path $DbDir 'schema.sql')
  }
  Run-Step 'Dump application data' {
    supabase db dump --linked -f (Join-Path $DbDir 'data.sql') --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes'
  }

  # 2) AUTH DATA
  Run-Step 'Dump Auth data' {
    supabase db dump --linked --schema auth --data-only --use-copy -f (Join-Path $DbDir 'auth-data.sql')
  }

  Run-Step 'Dump Auth schema reference' {
    supabase db dump --linked --schema auth -f (Join-Path $DbDir 'auth-schema.sql')
  } $false

  # 3) STORAGE METADATA
  Run-Step 'Dump Storage metadata' {
    supabase db dump --linked --schema storage --data-only --use-copy -f (Join-Path $DbDir 'storage-metadata.sql')
  } $false

  # Migration SQL files are already versioned in GitHub. Some hosted projects do not expose
  # a dumpable supabase_migrations schema, so we intentionally skip it here.

  # 4) STORAGE OBJECT FILES
  # Stay inside the linked workdir so the CLI can resolve the linked project.
  # The destination is relative to WorkDir: ../storage/<bucket>.
  Run-Step 'Download bucket tkb-private' {
    $dest = Join-Path $StorageDir 'tkb-private'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    supabase storage cp -r 'ss:///tkb-private' '..\storage\tkb-private' --experimental --linked
  }

  Run-Step 'Download bucket site-branding' {
    $dest = Join-Path $StorageDir 'site-branding'
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    supabase storage cp -r 'ss:///site-branding' '..\storage\site-branding' --experimental --linked
  } $false

  # 5) EDGE FUNCTIONS
  Run-Step 'List Edge Functions' {
    supabase functions list --project-ref $ProjectRef | Out-File -FilePath (Join-Path $MetaDir 'edge-functions-list.txt') -Encoding utf8
  } $false

  Run-Step 'Download Edge Function admin-users' {
    supabase functions download admin-users --project-ref $ProjectRef --use-api
    $src = Join-Path $WorkDir 'supabase\functions\admin-users'
    if(-not (Test-Path $src)){ throw 'admin-users source was not found after download.' }
    Copy-Item -Path $src -Destination (Join-Path $FunctionsDir 'admin-users') -Recurse -Force
  } $false

  # 6) SECRET NAMES/DIGESTS ONLY
  Run-Step 'List Edge Function secret names' {
    supabase secrets list --project-ref $ProjectRef | Out-File -FilePath (Join-Path $MetaDir 'secrets-list.txt') -Encoding utf8
  } $false

  @"
SECRET CHECKLIST - VALUES ARE NOT INCLUDED

secrets-list.txt records the names/digests that Supabase exposes.
It does NOT provide a recoverable copy of custom secret values.
Keep custom secret VALUES in a private password manager or secret vault.
Never commit service-role/secret keys or .env files to a public repository.
"@ | Set-Content -Path (Join-Path $MetaDir 'SECRETS_CHECKLIST.txt') -Encoding UTF8

  # 7) NON-SENSITIVE PROJECT METADATA
  Run-Step 'Record project list for verification' {
    supabase projects list | Out-File -FilePath (Join-Path $MetaDir 'projects-list.txt') -Encoding utf8
  } $false

} finally {
  Pop-Location
}

# 8) INTEGRITY HASHES
Write-Status 'Creating SHA256SUMS...'
$hashFile = Join-Path $OutDir 'SHA256SUMS.txt'
Get-ChildItem -Path $OutDir -File -Recurse |
  Where-Object { $_.FullName -ne $hashFile -and $_.FullName -ne $StatusFile } |
  Sort-Object FullName |
  ForEach-Object {
    $h = Get-FileHash -Algorithm SHA256 -Path $_.FullName
    $rel = $_.FullName.Substring($OutDir.Length).TrimStart('\')
    "$($h.Hash)  $rel"
  } | Set-Content -Path $hashFile -Encoding UTF8

Write-Status 'BACKUP SCRIPT COMPLETED.'
Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host 'BACKUP OUTPUT:' -ForegroundColor Green
Write-Host $OutDir -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Before calling this a complete backup, verify:' -ForegroundColor Yellow
Write-Host '1) BACKUP_STATUS.txt has no critical errors.' -ForegroundColor Yellow
Write-Host '2) Dashboard > Database > Backups is checked separately.' -ForegroundColor Yellow
Write-Host '3) Custom secret VALUES are stored privately outside GitHub.' -ForegroundColor Yellow
Write-Host '4) Copy this backup folder to at least one additional private location.' -ForegroundColor Yellow
