param(
  [ValidateSet("mock", "real")]
  [string]$Mode = "mock",

  [ValidateSet("smoke", "load", "stress", "spike")]
  [string]$Profile = "smoke",

  [string]$BaseUrl = "",
  [string]$Token = "arookieofc",
  [string]$JMeterBin = $env:JMETER_BIN,
  [int]$MockPort = 18001,
  [int]$MockLatencyMs = 25,
  [int]$MaxSampleMs = 600000
)

$ErrorActionPreference = "Stop"

function Get-ProfileConfig {
  param([string]$Name)

  switch ($Name) {
    "smoke" { return @{ Threads = 1; RampUp = 1; Duration = 30; Loops = 5 } }
    "load" { return @{ Threads = 10; RampUp = 10; Duration = 120; Loops = -1 } }
    "stress" { return @{ Threads = 50; RampUp = 30; Duration = 300; Loops = -1 } }
    "spike" { return @{ Threads = 100; RampUp = 5; Duration = 60; Loops = -1 } }
  }
}

function Resolve-JMeterBin {
  param([string]$Candidate)

  if ($Candidate) {
    return $Candidate
  }

  $command = Get-Command jmeter -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "JMeter was not found. Set JMETER_BIN or add jmeter to PATH."
}

function Wait-HttpHealth {
  param([string]$Url)

  for ($i = 1; $i -le 60; $i += 1) {
    try {
      $response = Invoke-WebRequest -Uri "$Url/health" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "Timed out waiting for $Url/health"
}

function Get-Percentile {
  param(
    [double[]]$Values,
    [double]$Percentile
  )

  if ($Values.Count -eq 0) {
    return 0
  }

  $ordered = $Values | Sort-Object
  $index = [Math]::Ceiling(($Percentile / 100) * $ordered.Count) - 1
  if ($index -lt 0) {
    $index = 0
  }
  return [double]$ordered[$index]
}

function Write-Summary {
  param(
    [string]$JtlPath,
    [string]$SummaryPath,
    [string]$Mode,
    [string]$Profile,
    [string]$BaseUrl
  )

  $rows = Import-Csv -LiteralPath $JtlPath
  $elapsed = @($rows | ForEach-Object { [double]$_.elapsed })
  $failed = @($rows | Where-Object { $_.success -ne "true" })
  $timestamps = @($rows | ForEach-Object { [double]$_.timeStamp })
  $durationSec = 0
  if ($timestamps.Count -gt 1) {
    $durationSec = (($timestamps | Measure-Object -Maximum).Maximum - ($timestamps | Measure-Object -Minimum).Minimum) / 1000
  }
  if ($durationSec -le 0) {
    $durationSec = 1
  }

  $summary = [ordered]@{
    mode = $Mode
    profile = $Profile
    baseUrl = $BaseUrl
    sampleCount = $rows.Count
    errorCount = $failed.Count
    errorRate = if ($rows.Count -gt 0) { [Math]::Round($failed.Count / $rows.Count, 6) } else { 0 }
    throughputPerSec = [Math]::Round($rows.Count / $durationSec, 4)
    avgLatencyMs = if ($elapsed.Count -gt 0) { [Math]::Round(($elapsed | Measure-Object -Average).Average, 2) } else { 0 }
    p50LatencyMs = [Math]::Round((Get-Percentile -Values $elapsed -Percentile 50), 2)
    p95LatencyMs = [Math]::Round((Get-Percentile -Values $elapsed -Percentile 95), 2)
    p99LatencyMs = [Math]::Round((Get-Percentile -Values $elapsed -Percentile 99), 2)
  }

  $summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $SummaryPath -Encoding UTF8
}

$root = Split-Path -Parent $PSScriptRoot
$jmeterDir = Join-Path $root "scripts\jmeter"
$jmx = Join-Path $jmeterDir "agent-chat-stream.jmx"
$caseFile = Join-Path $jmeterDir "agent-chat-cases.csv"
$mockServer = Join-Path $jmeterDir "agent_jmeter_mock_server.py"
$resultRoot = Join-Path $jmeterDir "results"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultDir = Join-Path $resultRoot "$Mode-$Profile-$timestamp"
$jtl = Join-Path $resultDir "results.jtl"
$html = Join-Path $resultDir "html"
$summary = Join-Path $resultDir "summary.json"
$mockProcess = $null

New-Item -ItemType Directory -Force -Path $resultDir | Out-Null

if (-not $BaseUrl) {
  if ($Mode -eq "mock") {
    $BaseUrl = "http://127.0.0.1:$MockPort"
  } else {
    $BaseUrl = "http://127.0.0.1:8001"
  }
}

try {
  if ($Mode -eq "mock") {
    $python = Join-Path $root "agent\.venv\Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $python)) {
      $python = "python"
    }

    $mockOut = Join-Path $resultDir "mock-server.out.log"
    $mockErr = Join-Path $resultDir "mock-server.err.log"
    $mockProcess = Start-Process `
      -FilePath $python `
      -ArgumentList @($mockServer, "--host", "127.0.0.1", "--port", "$MockPort", "--token", $Token, "--latency-ms", "$MockLatencyMs") `
      -RedirectStandardOutput $mockOut `
      -RedirectStandardError $mockErr `
      -PassThru `
      -NoNewWindow
    Wait-HttpHealth -Url $BaseUrl
  }

  $profileConfig = Get-ProfileConfig -Name $Profile
  $resolvedJMeter = Resolve-JMeterBin -Candidate $JMeterBin

  $jmeterArgs = @(
    "-n",
    "-t", $jmx,
    "-l", $jtl,
    "-e",
    "-o", $html,
    "-JBASE_URL=$BaseUrl",
    "-JTOKEN=$Token",
    "-JCASE_FILE=$caseFile",
    "-JTHREADS=$($profileConfig.Threads)",
    "-JRAMP_UP=$($profileConfig.RampUp)",
    "-JDURATION=$($profileConfig.Duration)",
    "-JLOOPS=$($profileConfig.Loops)",
    "-JMAX_SAMPLE_MS=$MaxSampleMs",
    "-Jjmeter.save.saveservice.output_format=csv",
    "-Jjmeter.save.saveservice.print_field_names=true"
  )

  & $resolvedJMeter @jmeterArgs
  if ($LASTEXITCODE -ne 0) {
    throw "JMeter failed with exit code $LASTEXITCODE"
  }

  Write-Summary -JtlPath $jtl -SummaryPath $summary -Mode $Mode -Profile $Profile -BaseUrl $BaseUrl
  Write-Host "JMeter result directory: $resultDir"
  Write-Host "Summary: $summary"
  Write-Host "HTML report: $html"
} finally {
  if ($mockProcess -and -not $mockProcess.HasExited) {
    Stop-Process -Id $mockProcess.Id -Force
  }
}
