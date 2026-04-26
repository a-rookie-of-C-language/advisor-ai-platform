param(
  [string]$NacosServer = "http://127.0.0.1:8848",
  [string]$NamespaceId = "public",
  [string]$Group = "DEFAULT_GROUP",
  [string]$DataId = "advisor-ai-platform-common.yaml",
  [string]$ConfigFile = "backend/nacos/advisor-ai-platform-common.yaml"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root $ConfigFile
if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Config file not found: $configPath"
}

$content = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8
$uri = "$NacosServer/nacos/v1/cs/configs"

$body = @{
  dataId = $DataId
  group = $Group
  tenant = $NamespaceId
  type = "yaml"
  content = $content
}

$response = Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType "application/x-www-form-urlencoded"
Write-Host "Nacos config publish result: $response"
Write-Host "Published DataId=$DataId, Group=$Group, Namespace=$NamespaceId"
