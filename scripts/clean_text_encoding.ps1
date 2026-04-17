param(
  [string]$Root = (Join-Path $PSScriptRoot ".."),
  [switch]$DryRun,
  [switch]$RepairMojibake
)

$ErrorActionPreference = "Stop"

try {
  Add-Type -AssemblyName "System.Text.Encoding.CodePages" -ErrorAction Stop
  [System.Text.Encoding]::RegisterProvider([System.Text.CodePagesEncodingProvider]::Instance)
}
catch {
  # Windows PowerShell usually has system codepages available by default.
}

$utf8StrictNoBom = New-Object System.Text.UTF8Encoding($false, $true)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$gb18030 = [System.Text.Encoding]::GetEncoding("GB18030")

$extensions = @(
  ".py", ".java", ".js", ".jsx", ".ts", ".tsx",
  ".json", ".yml", ".yaml", ".xml", ".properties",
  ".md", ".txt", ".sql", ".ps1", ".sh", ".css", ".scss", ".html", ".htm"
)

function Test-HasUtf8Bom {
  param([byte[]]$Bytes)
  if ($Bytes.Length -lt 3) { return $false }
  return ($Bytes[0] -eq 0xEF -and $Bytes[1] -eq 0xBB -and $Bytes[2] -eq 0xBF)
}

function Get-MojibakeScore {
  param([string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return 0 }
  # Common mojibake markers found in UTF8<->GBK mishandling.
  $matches = [regex]::Matches($Text, "[锛鏂銆鈥姹瀛涓�]")
  return $matches.Count
}

function Try-RepairMojibake {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) { return $Text }

  $best = $Text
  $bestScore = Get-MojibakeScore -Text $Text
  $candidates = @()

  try {
    $bytes1 = $gb18030.GetBytes($Text)
    $candidates += $utf8NoBom.GetString($bytes1)
  }
  catch { }

  try {
    $latin1 = [System.Text.Encoding]::GetEncoding(28591)
    $bytes2 = $latin1.GetBytes($Text)
    $candidates += $utf8NoBom.GetString($bytes2)
  }
  catch { }

  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $score = Get-MojibakeScore -Text $candidate
    if ($score -lt $bestScore) {
      $best = $candidate
      $bestScore = $score
    }
  }

  return $best
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
Set-Location $resolvedRoot

function Test-SafeLiteralPath {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  try {
    return Test-Path -LiteralPath $Path
  }
  catch {
    return $false
  }
}

$allFiles = @(git ls-files --cached --others --exclude-standard) | Where-Object {
  $_ -and (Test-SafeLiteralPath $_)
}
if ($allFiles.Count -eq 0) {
  Write-Host "No target files."
  exit 0
}

function Get-SafeExtension {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return "" }
  try {
    return [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  }
  catch {
    return ""
  }
}

$targetFiles = $allFiles | Where-Object {
  $ext = Get-SafeExtension $_
  $extensions -contains $ext
}

$changed = 0
$bomFixed = 0
$decodedByGb = 0
$mojibakeFixed = 0

foreach ($file in $targetFiles) {
  $full = Join-Path $resolvedRoot $file
  $bytes = [System.IO.File]::ReadAllBytes($full)

  if ($bytes.Length -eq 0) { continue }

  $hadBom = Test-HasUtf8Bom -Bytes $bytes
  $text = $null
  $usedGb = $false

  try {
    $text = $utf8StrictNoBom.GetString($bytes)
  }
  catch {
    $text = $gb18030.GetString($bytes)
    $usedGb = $true
  }

  if ($RepairMojibake) {
    $repaired = Try-RepairMojibake -Text $text
    if ($repaired -ne $text) {
      $text = $repaired
      $mojibakeFixed++
    }
  }

  $newBytes = $utf8NoBom.GetBytes($text)
  $needWrite = $hadBom -or $usedGb -or -not [System.Linq.Enumerable]::SequenceEqual($bytes, $newBytes)
  if (-not $needWrite) { continue }

  if ($DryRun) {
    Write-Host "[DRY-RUN] would fix: $file"
  }
  else {
    [System.IO.File]::WriteAllBytes($full, $newBytes)
    Write-Host "fixed: $file"
  }

  $changed++
  if ($hadBom) { $bomFixed++ }
  if ($usedGb) { $decodedByGb++ }
}

Write-Host ""
Write-Host "Cleanup summary:"
Write-Host "- scanned files: $($targetFiles.Count)"
Write-Host "- changed files: $changed"
Write-Host "- removed UTF-8 BOM: $bomFixed"
Write-Host "- fallback decoded by GB18030: $decodedByGb"
Write-Host "- mojibake candidates repaired: $mojibakeFixed"
Write-Host "- mode: $(if ($DryRun) { "DRY-RUN" } else { "APPLY" })"
