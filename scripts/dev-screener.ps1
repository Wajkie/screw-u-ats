# Starts the check server and docs site dev server in separate windows,
# then opens the browser to the Try It section.
#
# Usage:
#   .\scripts\dev-screener.ps1
#   .\scripts\dev-screener.ps1 -CheckPort 4000 -DocsPort 5173

param(
  [int]$CheckPort = 3001,
  [int]$DocsPort  = 5173
)

$root = Resolve-Path "$PSScriptRoot\.."

# Window 1: MCP server + Hono REST check server
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd '$root'; `$env:CHECK_PORT = $CheckPort; npm run dev"
)

# Window 2: Vite docs site
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd '$root\docssite'; npm run dev -- --port $DocsPort"
)

Write-Host ""
Write-Host "  Check server  ->  http://localhost:$CheckPort"
Write-Host "  Docs site     ->  http://localhost:$DocsPort"
Write-Host ""
Write-Host "  Waiting a few seconds then opening the browser..."

Start-Sleep 4
Start-Process "http://localhost:${DocsPort}/#screener"
