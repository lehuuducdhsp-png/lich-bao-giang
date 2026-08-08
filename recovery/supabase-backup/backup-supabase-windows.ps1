Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Bộ sao lưu Supabase cho dự án Lịch Báo giảng.
# KHÔNG ghi mật khẩu DB, access token, service-role key hay secret vào file này.

$ProjectRef = 'gmkibmybqfomypytmjxw'
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutDir = Join-Path $BaseDir "output\$Stamp"
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

function Require-Command([string]$Name,[string]$Help){
  if(-not (Get-Command $Name -ErrorAction SilentlyContinue)){
    throw "Thiếu '$Name'. $Help"
  }
}

function Run-Step([string]$Name,[scriptblock]$Action,[bool]$Critical=$true){
  Write-Status "BẮT ĐẦU: $Name"
  try {
    & $Action
    if($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0){ throw "Mã lỗi $LASTEXITCODE" }
    Write-Status "OK: $Name"
    return $true
  } catch {
    Write-Status "LỖI: $Name — $($_.Exception.Message)"
    if($Critical){ throw }
    return $false
  }
}

@"
BẢN SAO LƯU SUPABASE — DỮ LIỆU RIÊNG TƯ
Project ref: $ProjectRef
Thời điểm: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')

CẢNH BÁO:
- Thư mục này có thể chứa dữ liệu tài khoản, hash mật khẩu, hồ sơ và TKB riêng tư.
- KHÔNG đưa thư mục output này lên GitHub công khai.
- KHÔNG gửi file backup cho người không có quyền quản trị.
- Secret/service-role key không được tự động sao lưu giá trị bởi script này.
"@ | Set-Content -Path (Join-Path $OutDir 'README-PRIVATE.txt') -Encoding UTF8

Require-Command 'supabase' 'Hãy cài Supabase CLI trước khi chạy script.'
Require-Command 'docker' 'Hãy cài và mở Docker Desktop; db dump của Supabase CLI cần Docker.'

Run-Step 'Kiểm tra Docker' { docker info | Out-Null }

# Kiểm tra phiên đăng nhập Supabase CLI. Nếu chưa đăng nhập, mở flow đăng nhập chính thức.
try {
  supabase projects list | Out-Null
  if($LASTEXITCODE -ne 0){ throw 'not logged in' }
} catch {
  Write-Host ''
  Write-Host 'Supabase CLI chưa đăng nhập. Một cửa sổ/flow đăng nhập chính thức sẽ được mở.' -ForegroundColor Yellow
  supabase login
  if($LASTEXITCODE -ne 0){ throw 'Không đăng nhập được Supabase CLI.' }
}

Push-Location $WorkDir
try {
  if(-not (Test-Path (Join-Path $WorkDir 'supabase\config.toml'))){
    Run-Step 'Khởi tạo workdir Supabase tạm' { supabase init }
  }

  Write-Host ''
  Write-Host 'Tiếp theo Supabase sẽ yêu cầu mật khẩu Database nếu máy chưa lưu.' -ForegroundColor Yellow
  Write-Host 'Không gửi mật khẩu đó cho bất kỳ ai và không dán vào GitHub.' -ForegroundColor Yellow
  Run-Step 'Liên kết đúng project Supabase' { supabase link --project-ref $ProjectRef }

  # 1) DATABASE CHÍNH
  Run-Step 'Dump roles' { supabase db dump --linked -f (Join-Path $DbDir 'roles.sql') --role-only }
  Run-Step 'Dump schema ứng dụng' { supabase db dump --linked -f (Join-Path $DbDir 'schema.sql') }
  Run-Step 'Dump data ứng dụng' { supabase db dump --linked -f (Join-Path $DbDir 'data.sql') --use-copy --data-only -x 'storage.buckets_vectors' -x 'storage.vector_indexes' }

  # 2) AUTH — lưu riêng để bảo toàn tài khoản/hash mật khẩu khi cần phục hồi.
  # CLI mặc định loại auth/storage; vì vậy yêu cầu schema auth một cách tường minh.
  Run-Step 'Dump dữ liệu Auth (auth.users, identities...)' {
    supabase db dump --linked --schema auth --data-only --use-copy -f (Join-Path $DbDir 'auth-data.sql')
  }

  # Lưu schema auth để điều tra/khôi phục tùy trường hợp. Khi dựng project Supabase mới,
  # không áp mù toàn bộ auth-schema.sql lên managed schema; đọc RESTORE_GUIDE.md trước.
  Run-Step 'Dump schema Auth để lưu trữ' {
    supabase db dump --linked --schema auth -f (Join-Path $DbDir 'auth-schema.sql')
  } $false

  # 3) STORAGE METADATA — file thật sẽ tải riêng ở bước Storage.
  Run-Step 'Dump metadata Storage' {
    supabase db dump --linked --schema storage --data-only --use-copy -f (Join-Path $DbDir 'storage-metadata.sql')
  } $false

  # 4) MIGRATION HISTORY
  Run-Step 'Dump schema migration history' {
    supabase db dump --linked --schema supabase_migrations -f (Join-Path $DbDir 'migration-history-schema.sql')
  } $false
  Run-Step 'Dump data migration history' {
    supabase db dump --linked --schema supabase_migrations --data-only --use-copy -f (Join-Path $DbDir 'migration-history-data.sql')
  } $false

  # 5) STORAGE OBJECTS THẬT
  Run-Step 'Tải toàn bộ bucket tkb-private' {
    New-Item -ItemType Directory -Force -Path (Join-Path $StorageDir 'tkb-private') | Out-Null
    supabase storage cp -r 'ss://tkb-private' (Join-Path $StorageDir 'tkb-private') --experimental --linked
  }
  Run-Step 'Tải toàn bộ bucket site-branding' {
    New-Item -ItemType Directory -Force -Path (Join-Path $StorageDir 'site-branding') | Out-Null
    supabase storage cp -r 'ss://site-branding' (Join-Path $StorageDir 'site-branding') --experimental --linked
  } $false

  # 6) EDGE FUNCTIONS
  Run-Step 'Ghi danh sách Edge Functions' {
    supabase functions list --project-ref $ProjectRef | Out-File -FilePath (Join-Path $MetaDir 'edge-functions-list.txt') -Encoding utf8
  } $false

  Run-Step 'Tải Edge Function admin-users' {
    supabase functions download admin-users --project-ref $ProjectRef
    $src = Join-Path $WorkDir 'supabase\functions\admin-users'
    if(-not (Test-Path $src)){ throw 'Không tìm thấy source admin-users sau khi download.' }
    Copy-Item -Path $src -Destination (Join-Path $FunctionsDir 'admin-users') -Recurse -Force
  } $false

  # 7) SECRET — Supabase chỉ liệt kê tên/digest, KHÔNG cho lấy lại giá trị secret.
  Run-Step 'Ghi danh sách tên Edge Function secrets' {
    supabase secrets list --project-ref $ProjectRef | Out-File -FilePath (Join-Path $MetaDir 'secrets-list.txt') -Encoding utf8
  } $false

  @"
SECRET CHECKLIST — KHÔNG PHẢI GIÁ TRỊ SECRET

Supabase không nên được coi là nơi duy nhất giữ bản sao giá trị custom secret.
File secrets-list.txt chỉ giúp biết secret nào tồn tại; giá trị thật có thể không xem lại được.

Hãy tự kiểm tra và cất GIÁ TRỊ custom secrets trong password manager/kho bí mật riêng, KHÔNG ở GitHub.
Các secret mặc định SUPABASE_URL / publishable/secret keys được Supabase quản lý theo project.
Nếu Edge Function admin-users chỉ dùng secret mặc định thì không cần chép service-role key vào repository.
"@ | Set-Content -Path (Join-Path $MetaDir 'SECRETS_CHECKLIST.txt') -Encoding UTF8

  # 8) PROJECT METADATA KHÔNG NHẠY CẢM
  Run-Step 'Ghi danh sách project để đối chiếu' {
    supabase projects list | Out-File -FilePath (Join-Path $MetaDir 'projects-list.txt') -Encoding utf8
  } $false

} finally {
  Pop-Location
}

# 9) HASH KIỂM TRA TOÀN VẸN
Write-Status 'Tạo SHA256SUMS...'
$hashFile = Join-Path $OutDir 'SHA256SUMS.txt'
Get-ChildItem -Path $OutDir -File -Recurse |
  Where-Object { $_.FullName -ne $hashFile -and $_.FullName -ne $StatusFile } |
  Sort-Object FullName |
  ForEach-Object {
    $h = Get-FileHash -Algorithm SHA256 -Path $_.FullName
    $rel = $_.FullName.Substring($OutDir.Length).TrimStart('\')
    "$($h.Hash)  $rel"
  } | Set-Content -Path $hashFile -Encoding UTF8

Write-Status 'HOÀN TẤT BỘ SAO LƯU TỰ ĐỘNG.'
Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host 'ĐÃ TẠO BACKUP TẠI:' -ForegroundColor Green
Write-Host $OutDir -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'CHƯA ĐƯỢC COI LÀ HOÀN CHỈNH cho đến khi bạn:' -ForegroundColor Yellow
Write-Host '1) kiểm tra BACKUP_STATUS.txt không còn bước quan trọng bị lỗi;' -ForegroundColor Yellow
Write-Host '2) kiểm tra Dashboard > Database > Backups;' -ForegroundColor Yellow
Write-Host '3) kiểm tra custom secret values đã được cất riêng an toàn;' -ForegroundColor Yellow
Write-Host '4) copy cả thư mục backup sang ít nhất một nơi riêng tư khác.' -ForegroundColor Yellow
