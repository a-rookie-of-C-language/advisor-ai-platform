param(
  [int]$Port = 8001,
  [string]$Token = "local-dev-agent-token"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$agentDir = Join-Path $repoRoot "agent"
$pythonExe = Join-Path $agentDir ".venv\Scripts\python.exe"

if (-not (Test-Path $pythonExe)) {
  Write-Error "Python venv not found: $pythonExe"
}

$env:AGENT_MODE = "api"
$env:AGENT_API_HOST = "127.0.0.1"
$env:AGENT_API_PORT = "$Port"
$env:AGENT_API_TOKEN = $Token

Write-Host "Starting local agent daemon at http://127.0.0.1:$Port"
Write-Host "AGENT_API_TOKEN is set from -Token parameter."

Set-Location $agentDir
& $pythonExe "app.py" "--mode" "api"

