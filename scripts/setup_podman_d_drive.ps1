param(
  [string]$MachineName = "podman-machine-default",
  [string]$StoragePath = "D:\podman-storage",
  [uint32]$Cpus = 10,
  [uint32]$Memory = 2048,
  [uint32]$DiskSize = 100,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Assert-PodmanAvailable {
  try {
    podman version | Out-Null
  } catch {
    throw "podman 不可用，请确认 Podman 已安装并加入 PATH。"
  }
}

function Get-PodmanMachineNames {
  $lines = podman machine list --format "{{.Name}}"
  return @($lines | Where-Object { $_ -and $_.Trim() -ne "" })
}

function Remove-PodmanConnectionIfExists {
  param([string]$Name)
  $connections = podman system connection list --format "{{.Name}}"
  if ($connections -contains $Name) {
    podman system connection rm $Name | Out-Null
  }
}

Assert-PodmanAvailable

$resolvedStoragePath = [System.IO.Path]::GetFullPath($StoragePath)
if (-not $resolvedStoragePath.StartsWith("D:\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "存储目录必须在 D 盘，例如 D:\podman-storage。当前值: $resolvedStoragePath"
}

Write-Host "目标 Podman Machine: $MachineName"
Write-Host "目标容器存储目录: $resolvedStoragePath"
Write-Host "注意：执行迁移会删除同名 Podman Machine，里面的镜像、容器、卷数据都会丢失。"

if (-not $Force) {
  Write-Host "未指定 -Force，当前只做预检查，不执行删除和重建。"
  Write-Host "确认无需保留现有 Podman 数据后执行："
  Write-Host "  .\scripts\setup_podman_d_drive.ps1 -Force"
  exit 0
}

$wslStoragePath = Join-Path $resolvedStoragePath "wsl"
$exportPath = Join-Path $resolvedStoragePath "$MachineName.tar"
New-Item -ItemType Directory -Force -Path $wslStoragePath | Out-Null

$machineNames = Get-PodmanMachineNames
if ($machineNames -contains $MachineName) {
  Write-Host "停止 Podman Machine: $MachineName"
  podman machine stop $MachineName | Out-Null
  Write-Host "删除 Podman Machine: $MachineName"
  try {
    podman machine rm --force $MachineName | Out-Null
  } catch {
    Write-Host "podman machine rm 失败，回退到 WSL 注销和 metadata 清理。"
    wsl --unregister $MachineName | Out-Null
    Remove-Item -Force "$env:USERPROFILE\.config\containers\podman\machine\wsl\$MachineName.ign" -ErrorAction SilentlyContinue
    Remove-Item -Force "$env:USERPROFILE\.config\containers\podman\machine\wsl\$MachineName.json" -ErrorAction SilentlyContinue
    Remove-Item -Force "$env:USERPROFILE\.config\containers\podman\machine\wsl\$MachineName.lock" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "$env:USERPROFILE\.local\share\containers\podman\machine\wsl\$MachineName" -ErrorAction SilentlyContinue
    Remove-Item -Force "$env:USERPROFILE\.local\share\containers\podman\machine\wsl\$MachineName-amd64" -ErrorAction SilentlyContinue
  }
}

Remove-PodmanConnectionIfExists -Name $MachineName
Remove-PodmanConnectionIfExists -Name "$MachineName-root"

Write-Host "重建 Podman Machine。"
podman machine init `
  --cpus $Cpus `
  --memory $Memory `
  --disk-size $DiskSize `
  --now `
  $MachineName | Out-Null

Write-Host "导出 WSL 发行版并导入到 D 盘目录。"
podman machine stop $MachineName | Out-Null
if (Test-Path -LiteralPath $exportPath) {
  Remove-Item -Force $exportPath
}
wsl --export $MachineName $exportPath | Out-Null
wsl --unregister $MachineName | Out-Null
Remove-Item -Recurse -Force $wslStoragePath -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $wslStoragePath | Out-Null
wsl --import $MachineName $wslStoragePath $exportPath --version 2 | Out-Null
Remove-Item -Force $exportPath
podman machine start $MachineName | Out-Null

Write-Host "Podman Machine 已迁移并启动。"
podman machine list
podman system connection list
