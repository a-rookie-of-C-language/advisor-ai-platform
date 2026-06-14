param(
  [string]$ComposeFile = "backend/docker-compose.yml",
  [string]$ContainerCli = "podman",
  [int]$WaitSeconds = 90,
  [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Stop"

function Assert-ContainerCliAvailable {
  param([string]$Cli)
  try {
    & $Cli version | Out-Null
  } catch {
    throw "$Cli 不可用，请先启动 Podman Machine 或确认 $Cli 已加入 PATH。"
  }
}

function Test-ContainerRunning {
  param([string]$Name)
  $running = & $ContainerCli ps --filter "name=^/${Name}$" --format "{{.Names}}"
  return $running -contains $Name
}

function Test-ContainerExists {
  param([string]$Name)
  $all = & $ContainerCli ps -a --filter "name=^/${Name}$" --format "{{.Names}}"
  return $all -contains $Name
}

function Ensure-ContainerRunning {
  param([string]$Name)

  if (Test-ContainerRunning -Name $Name) {
    Write-Host "容器已在运行: $Name"
    return
  }

  if (Test-ContainerExists -Name $Name) {
    Write-Host "启动已有容器: $Name"
    & $ContainerCli start $Name | Out-Null
    return
  }
}

function Test-PortReady {
  param([int]$Port)
  try {
    $tcp = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    return $null -ne $tcp
  } catch {
    return $false
  }
}

Assert-ContainerCliAvailable -Cli $ContainerCli

$root = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $root $ComposeFile
if (-not (Test-Path -LiteralPath $composePath)) {
  throw "未找到 compose 文件: $composePath"
}

$containers = @(
  @{ Name = "advisor-nacos"; Port = 8848 },
  @{ Name = "advisor-postgres"; Port = 5432 },
  @{ Name = "advisor-jaeger"; Port = 16686 }
)

foreach ($c in $containers) {
  Ensure-ContainerRunning -Name $c.Name
}

$allRunning = $true
foreach ($c in $containers) {
  if (-not (Test-ContainerRunning -Name $c.Name)) {
    $allRunning = $false
    break
  }
}

if (-not $allRunning) {
  Write-Host "检测到仍有容器未运行，回退到 $ContainerCli compose up -d"
  & $ContainerCli compose -f $composePath up -d
}

if (-not $SkipHealthCheck) {
  $deadline = (Get-Date).AddSeconds($WaitSeconds)
  while ((Get-Date) -lt $deadline) {
    $ready = $true
    foreach ($c in $containers) {
      if (-not (Test-ContainerRunning -Name $c.Name)) {
        $ready = $false
        break
      }
      if (-not (Test-PortReady -Port $c.Port)) {
        $ready = $false
        break
      }
    }

    if ($ready) {
      Write-Host "基础容器已就绪: advisor-nacos(8848), advisor-postgres(5432), advisor-jaeger(16686)"
      exit 0
    }

    Start-Sleep -Seconds 2
  }

  throw "容器启动超时：请执行 $ContainerCli ps -a 与 $ContainerCli logs <container> 排查。"
}

Write-Host "基础容器已启动（已跳过健康检查）。"
