param(
  [switch]$StartApps
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command '$Name' tidak ditemukan. Instal terlebih dahulu lalu jalankan ulang."
  }
}

Require-Command "docker"
Require-Command "node"
Require-Command "npm"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Membuat .env dari .env.example"
}

if (-not (Test-Path "frontend/.env")) {
  Copy-Item "frontend/.env.example" "frontend/.env"
  Write-Host "Membuat frontend/.env dari frontend/.env.example"
}

Write-Host "Menyalakan PostgreSQL..."
docker compose up -d postgres

Write-Host "Menunggu PostgreSQL siap..."
$ready = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  docker compose exec -T postgres pg_isready -U postgres -d hl_dev | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  throw "PostgreSQL belum siap setelah 60 detik. Periksa dengan: docker compose logs postgres"
}

Write-Host "Memasang dependency backend..."
npm install
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run check

Write-Host "Memasang dependency dan memvalidasi frontend..."
Push-Location "frontend"
try {
  npm install
  npm run typecheck
  npm test
  npm run build
} finally {
  Pop-Location
}

Write-Host "Menampilkan ringkasan database..."
Get-Content "scripts/verify-db.sql" | docker compose exec -T postgres psql -U postgres -d hl_dev

if ($StartApps) {
  Write-Host "Menjalankan backend dan frontend pada terminal terpisah..."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm run dev"
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root/frontend'; npm run dev"
}

Write-Host ""
Write-Host "Setup lokal selesai."
Write-Host "Backend : http://localhost:3000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Login   : owner / change-this-password"
Write-Host "PIN     : 123456"
Write-Host ""
Write-Host "Sesudah membuat transaksi di UI, jalankan:"
Write-Host "Get-Content scripts/verify-db.sql | docker compose exec -T postgres psql -U postgres -d hl_dev"
