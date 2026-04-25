$ErrorActionPreference = "Stop"

$port = if ($env:PORT) { [int]$env:PORT } else { 3000 }
$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if (-not $listeners) {
  Write-Host "No local API listener found on port $port."
  exit 0
}

$processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($processId in $processIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Stopping process $processId on port $port..."
    Stop-Process -Id $processId
  }
}

Write-Host "Stopped local API listener on port $port."
