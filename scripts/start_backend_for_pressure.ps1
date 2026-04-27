param(
  [ValidateSet("wait", "fastfail")]
  [string]$ReadyMode = "wait",
  [int]$WaitReadySeconds = 180,
  [string]$NacosServer = "http://127.0.0.1:8848",
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort = 5432,
  [string]$DbName = "postgres",
  [string]$DbUsername = "postgres",
  [string]$DbPassword = "su201314",
  [string]$RuntimeDir = "runtime"
)

$ErrorActionPreference = "Stop"

function Test-PortListening {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return $null -ne $conn
}

function Test-HealthEndpoint {
  param([int]$Port)
  try {
    $resp = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/actuator/health" -TimeoutSec 3
    return $resp.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-JavaService {
  param(
    [string]$Name,
    [string]$WorkDir,
    [int]$Port,
    [string]$LogFile,
    [hashtable]$ExtraEnv = @{}
  )

  if (Test-PortListening -Port $Port) {
    Write-Host "Service already listening: $Name ($Port)"
    return
  }

  $envScript = @(
    "`$env:NACOS_SERVER_ADDR='127.0.0.1:8848'"
    "`$env:DB_HOST='$DbHost'"
    "`$env:DB_PORT='$DbPort'"
    "`$env:DB_NAME='$DbName'"
    "`$env:DB_USERNAME='$DbUsername'"
    "`$env:DB_PASSWORD='$DbPassword'"
    "`$env:JWT_SECRET='Y25FZHVDcXV0QWR2aXNvckFpUGxhdGZvcm1Bcm9va2llb2ZjbGFuZ3VhZ2U='"
    "`$env:ADVISOR_JWT_SECRET='Y25FZHVDcXV0QWR2aXNvckFpUGxhdGZvcm1Bcm9va2llb2ZjbGFuZ3VhZ2U='"
    "`$env:INTERNAL_SERVICE_TOKEN='arookieofc'"
    "`$env:MEMORY_API_TOKEN='arookieofc'"
    "`$env:AGENT_API_TOKEN='arookieofc'"
  )

  foreach ($key in $ExtraEnv.Keys) {
    $value = [string]$ExtraEnv[$key]
    $envScript += "`$env:$key='$value'"
  }

  $cmdParts = @(
    ($envScript -join "; ")
    "Set-Location -LiteralPath '$WorkDir'"
    "mvn spring-boot:run *>> '$LogFile'"
  )
  $cmd = $cmdParts -join "; "

  Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd) -WindowStyle Hidden | Out-Null
  Write-Host "Service start requested: $Name ($Port)"
}

$root = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $root $RuntimeDir
New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null

& (Join-Path $PSScriptRoot "push_nacos_common_config.ps1") -NacosServer $NacosServer | Out-Host

$services = @(
  @{
    Name = "auth-service"
    WorkDir = Join-Path $root "backend\auth-service"
    Port = 8081
    Log = Join-Path $runtimePath "auth-service.log"
    ExtraEnv = @{}
  },
  @{
    Name = "chat-service"
    WorkDir = Join-Path $root "backend\chat-service"
    Port = 8082
    Log = Join-Path $runtimePath "chat-service.log"
    ExtraEnv = @{ "SPRING_PROFILES_ACTIVE" = "local" }
  },
  @{
    Name = "memory-service"
    WorkDir = Join-Path $root "backend\memory-service"
    Port = 8084
    Log = Join-Path $runtimePath "memory-service.log"
    ExtraEnv = @{}
  },
  @{
    Name = "gateway"
    WorkDir = Join-Path $root "backend\gateway"
    Port = 8080
    Log = Join-Path $runtimePath "gateway.log"
    ExtraEnv = @{}
  }
)

foreach ($svc in $services) {
  Start-JavaService -Name $svc.Name -WorkDir $svc.WorkDir -Port $svc.Port -LogFile $svc.Log -ExtraEnv $svc.ExtraEnv
}

function Test-AllReady {
  foreach ($svc in $services) {
    if (-not (Test-PortListening -Port $svc.Port)) {
      return $false
    }
  }
  foreach ($svc in $services) {
    if (-not (Test-HealthEndpoint -Port $svc.Port)) {
      return $false
    }
  }
  return $true
}

$ready = $false
if ($ReadyMode -eq "fastfail") {
  Start-Sleep -Seconds 2
  $ready = Test-AllReady
} else {
  $deadline = (Get-Date).AddSeconds($WaitReadySeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-AllReady) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 3
  }
}

if (-not $ready) {
  throw "Backend services are not ready. Mode=$ReadyMode"
}

Write-Host "Backend services are ready for pressure test."
