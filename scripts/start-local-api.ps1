$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { [int]$env:PORT } else { 3000 }
$dataDir = Join-Path $root "data"
$logDir = Join-Path $root "logs"
$outLog = Join-Path $logDir "api.out.log"
$errLog = Join-Path $logDir "api.err.log"

Set-Location $root
New-Item -ItemType Directory -Force -Path $dataDir, $logDir | Out-Null

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  Write-Host "API is already listening on http://127.0.0.1:$port (PID $($listener.OwningProcess))."
  try {
    $ready = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health/ready" -TimeoutSec 5
    Write-Host "Health: $($ready.status), database: $($ready.checks.database)"
  } catch {
    Write-Host "Port is occupied, but health check failed: $($_.Exception.Message)"
  }
  exit 0
}

if (-not (Test-Path -LiteralPath (Join-Path $root "node_modules"))) {
  Write-Host "Installing workspace dependencies..."
  corepack pnpm install
}

if (-not (Test-Path -LiteralPath (Join-Path $dataDir "app.db"))) {
  Write-Host "Seeding demo data into data/app.db..."
  corepack pnpm --filter @couple-life/api seed:demo
}

Write-Host "Starting API on http://127.0.0.1:$port ..."
$env:HOST = if ($env:HOST) { $env:HOST } else { "0.0.0.0" }
$env:PORT = "$port"
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "file:./data/app.db" }

$process = Start-Process -FilePath "corepack" `
  -ArgumentList @("pnpm", "--filter", "@couple-life/api", "dev") `
  -WorkingDirectory $root `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -WindowStyle Hidden `
  -PassThru

for ($attempt = 1; $attempt -le 30; $attempt++) {
  Start-Sleep -Seconds 1
  try {
    $ready = Invoke-RestMethod -Uri "http://127.0.0.1:$port/health/ready" -TimeoutSec 2
    Write-Host "API started. PID $($process.Id). Health: $($ready.status), database: $($ready.checks.database)"
    Write-Host "Logs: $outLog"
    exit 0
  } catch {
    if ($process.HasExited) {
      Write-Host "API process exited early. Error log: $errLog"
      exit 1
    }
  }
}

Write-Host "API did not become ready in time. Error log: $errLog"
exit 1
