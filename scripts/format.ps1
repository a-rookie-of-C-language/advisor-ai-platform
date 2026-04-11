$ErrorActionPreference = "Stop"

$extensions = @(
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".sql",
  ".yml", ".yaml", ".py", ".java", ".xml", ".properties",
  ".sh", ".ps1", ".css", ".scss", ".html", ".htm",
  ".c", ".h", ".cpp", ".hpp", ".cs", ".go", ".rs", ".txt"
)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

# Only include tracked/untracked files that are not ignored by .gitignore
$raw = git ls-files -z --cached --others --exclude-standard
if (-not $raw) {
  Write-Host "No files found."
  exit 0
}

$files = ($raw -split "`0") | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
$targetFiles = $files | Where-Object { $extensions -contains ([System.IO.Path]::GetExtension($_).ToLowerInvariant()) }

$changed = 0
foreach ($file in $targetFiles) {
  $content = [System.IO.File]::ReadAllText($file)
  if ($content.Contains("`r`n")) {
    $normalized = $content.Replace("`r`n", "`n")
    [System.IO.File]::WriteAllText($file, $normalized, $utf8NoBom)
    $changed++
    Write-Host "Converted: $file"
  }
}

Write-Host "Done. Changed files: $changed"