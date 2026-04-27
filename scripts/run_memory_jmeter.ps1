param(
  [ValidateSet("smoke", "load", "stress", "spike")]
  [string]$Profile = "smoke",

  [string]$BaseUrl = "http://127.0.0.1:8080",
  [string]$MemoryToken = "arookieofc",
  [int]$KbId = 1,
  [string]$AuthPassword = "Test@123456",
  [string]$JMeterBin = $env:JMETER_BIN,
  [int]$MaxSampleMs = 600000,
  [switch]$AutoStartServices,
  [ValidateSet("wait", "fastfail")]
  [string]$ServiceReadyMode = "wait",
  [int]$ServiceReadyTimeoutSec = 180,
  [string]$DbHost = "127.0.0.1",
  [int]$DbPort = 5432,
  [string]$DbName = "postgres",
  [string]$DbUsername = "postgres",
  [string]$DbPassword = "su201314"
)

$ErrorActionPreference = "Stop"

function Get-ProfileConfig {
  param([string]$Name)

  switch ($Name) {
    "smoke" { return @{ Threads = 1; RampUp = 1; Duration = 30; Loops = 3 } }
    "load" { return @{ Threads = 10; RampUp = 15; Duration = 300; Loops = -1 } }
    "stress" { return @{ Threads = 50; RampUp = 30; Duration = 600; Loops = -1 } }
    "spike" { return @{ Threads = 100; RampUp = 5; Duration = 120; Loops = -1 } }
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
    byLabel = @(
      $rows |
        Group-Object -Property label |
        ForEach-Object {
          $groupRows = $_.Group
          $groupElapsed = @($groupRows | ForEach-Object { [double]$_.elapsed })
          $groupFailed = @($groupRows | Where-Object { $_.success -ne "true" })
          [ordered]@{
            label = $_.Name
            sampleCount = $groupRows.Count
            errorCount = $groupFailed.Count
            errorRate = if ($groupRows.Count -gt 0) { [Math]::Round($groupFailed.Count / $groupRows.Count, 6) } else { 0 }
            avgLatencyMs = if ($groupElapsed.Count -gt 0) { [Math]::Round(($groupElapsed | Measure-Object -Average).Average, 2) } else { 0 }
            p95LatencyMs = [Math]::Round((Get-Percentile -Values $groupElapsed -Percentile 95), 2)
          }
        }
    )
  }

  $summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $SummaryPath -Encoding UTF8
}

$root = Split-Path -Parent $PSScriptRoot
$jmeterDir = Join-Path $root "scripts\jmeter"
$jmx = Join-Path $jmeterDir "memory-fullchain.jmx"
$caseFile = Join-Path $jmeterDir "memory-fullchain-cases.csv"
$resultRoot = Join-Path $jmeterDir "results"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resultDir = Join-Path $resultRoot "memory-$Profile-$timestamp"
$jtl = Join-Path $resultDir "results.jtl"
$html = Join-Path $resultDir "html"
$summary = Join-Path $resultDir "summary.json"

New-Item -ItemType Directory -Force -Path $resultDir | Out-Null

if ($AutoStartServices) {
  $starter = Join-Path $PSScriptRoot "start_backend_for_pressure.ps1"
  & $starter `
    -ReadyMode $ServiceReadyMode `
    -WaitReadySeconds $ServiceReadyTimeoutSec `
    -DbHost $DbHost `
    -DbPort $DbPort `
    -DbName $DbName `
    -DbUsername $DbUsername `
    -DbPassword $DbPassword
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
  "-JMEMORY_TOKEN=$MemoryToken",
  "-JKB_ID=$KbId",
  "-JAUTH_PASSWORD=$AuthPassword",
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

Write-Summary -JtlPath $jtl -SummaryPath $summary -Profile $Profile -BaseUrl $BaseUrl
Write-Host "JMeter result directory: $resultDir"
Write-Host "Summary: $summary"
Write-Host "HTML report: $html"
