param(
  [int]$Port = 8001,
  [string]$Token = "local-dev-agent-token",
  [switch]$EnableMcpTools,
  [string]$McpServers = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

$env:AGENT_API_HOST = "127.0.0.1"
$env:AGENT_API_PORT = "$Port"
$env:AGENT_API_TOKEN = $Token
if ($EnableMcpTools) {
  $env:MCP_TOOLS = "true"
  if ($McpServers) {
    $env:MCP_SERVERS = $McpServers
  }
}

Write-Host "Starting local TypeScript + Rust agent daemon at http://127.0.0.1:$Port"
Write-Host "AGENT_API_TOKEN is set from -Token parameter."
if ($EnableMcpTools) {
  Write-Host "MCP tools are enabled for the local TS agent."
}

$agentTsDir = Join-Path $repoRoot "agent-ts"
$agentCoreExe = Join-Path $repoRoot "agent-core\target\debug\agent-core.exe"
if (Test-Path $agentCoreExe) {
  $env:AGENT_CORE_PATH = $agentCoreExe
}

Set-Location $agentTsDir
if (Test-Path "dist\main.js") {
  node "dist\main.js"
} else {
  npm run dev
}
