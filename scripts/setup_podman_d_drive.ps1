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

New-Item -ItemType Directory -Force -Path $resolvedStoragePath | Out-Null

$machineNames = Get-PodmanMachineNames
if ($machineNames -contains $MachineName) {
  Write-Host "停止 Podman Machine: $MachineName"
  podman machine stop $MachineName | Out-Null
  Write-Host "删除 Podman Machine: $MachineName"
  podman machine rm --force $MachineName | Out-Null
}

Write-Host "重建 Podman Machine，并将 /var/lib/containers 挂载到 D 盘目录。"
podman machine init `
  --cpus $Cpus `
  --memory $Memory `
  --disk-size $DiskSize `
  --volume "${resolvedStoragePath}:/var/lib/containers" `
  --now `
  $MachineName | Out-Null

Write-Host "Podman Machine 已启动。"
podman machine list
podman system connection list
