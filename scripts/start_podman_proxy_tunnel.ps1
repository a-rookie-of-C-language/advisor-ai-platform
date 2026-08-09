param(
  [string]$MachineName = "podman-machine-default",
  [string]$ProxyUrl = "",
  [int]$RemotePort = 33211
)

$ErrorActionPreference = "Stop"

function Get-ProxyUri {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    $Value = $env:HTTPS_PROXY
  }
  if ([string]::IsNullOrWhiteSpace($Value)) {
    $Value = $env:HTTP_PROXY
  }
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "未发现 HTTP_PROXY/HTTPS_PROXY。"
  }
  return [Uri]$Value
}

function Get-PodmanConnection {
  param([string]$Name)
  $connections = podman system connection list --format json | ConvertFrom-Json
  $connection = $connections | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
  if ($null -eq $connection) {
    throw "未找到 Podman Machine 连接: $Name"
  }
  return $connection
}

function Ensure-TunnelProcess {
  param(
    [object]$Connection,
    [Uri]$ProxyUri,
    [int]$RemotePort
  )
  $existing = podman machine ssh $MachineName "ss -ltn | grep ':$RemotePort ' || true"
  if (-not [string]::IsNullOrWhiteSpace($existing)) {
    return
  }
  if ($Connection.URI -notmatch "ssh://([^@]+)@([^:/]+):(\d+)/") {
    throw "无法解析 Podman SSH 连接: $($Connection.URI)"
  }
  $sshUser = $Matches[1]
  $sshHost = $Matches[2]
  $sshPort = $Matches[3]
  $identity = $Connection.Identity
  Start-Process ssh -WindowStyle Hidden -ArgumentList @(
    "-i",
    $identity,
    "-p",
    $sshPort,
    "-N",
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=NUL",
    "-R",
    "${RemotePort}:$($ProxyUri.Host):$($ProxyUri.Port)",
    "${sshUser}@${sshHost}"
  )
  Start-Sleep -Seconds 2
}

function Configure-PodmanServiceProxy {
  param([int]$RemotePort)
  $proxy = "http://127.0.0.1:$RemotePort"
  podman machine ssh --username root $MachineName "chown -R user:user /home/user/.config/systemd || true" | Out-Null
  podman machine ssh $MachineName "mkdir -p ~/.config/systemd/user/podman.service.d && printf '[Service]\nEnvironment=HTTP_PROXY=$proxy\nEnvironment=HTTPS_PROXY=$proxy\nEnvironment=http_proxy=$proxy\nEnvironment=https_proxy=$proxy\nEnvironment=NO_PROXY=localhost,127.0.0.1,::1\nEnvironment=no_proxy=localhost,127.0.0.1,::1\n' > ~/.config/systemd/user/podman.service.d/proxy.conf && systemctl --user daemon-reload && systemctl --user restart podman.socket && systemctl --user stop podman.service || true" | Out-Null
}

$proxyUri = Get-ProxyUri -Value $ProxyUrl
if ($proxyUri.Host -notin @("127.0.0.1", "localhost")) {
  Write-Host "代理不是 localhost，无需创建 Podman SSH 反向隧道。"
  exit 0
}

$connection = Get-PodmanConnection -Name $MachineName
Ensure-TunnelProcess -Connection $connection -ProxyUri $proxyUri -RemotePort $RemotePort
Configure-PodmanServiceProxy -RemotePort $RemotePort
Write-Host "Podman 代理隧道已就绪: VM 127.0.0.1:$RemotePort -> Windows $($proxyUri.Host):$($proxyUri.Port)"
