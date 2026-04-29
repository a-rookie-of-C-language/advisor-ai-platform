$ErrorActionPreference = "Stop"

$containers = @(
  "advisor-nacos",
  "advisor-postgres",
  "advisor-jaeger"
)

foreach ($name in $containers) {
  $exists = docker ps -a --filter "name=^/${name}$" --format "{{.Names}}"
  if ($exists -contains $name) {
    Write-Host "停止容器: $name"
    docker stop $name | Out-Null
  } else {
    Write-Host "容器不存在，跳过: $name"
  }
}

Write-Host "基础容器停止完成。"
