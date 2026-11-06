<#
.SYNOPSIS
  本地构建 monitor-frontend 的 dist 并打包成可上传的 .tar.gz。

.DESCRIPTION
  产物是纯静态文件（index.html + assets/），服务器无需 Node.js。
  dist 通过 `tar -czf` 打包，包内根目录就是 index.html 和 assets/。

.EXAMPLE
  .\deploy\build-dist.ps1

.EXAMPLE
  .\deploy\build-dist.ps1 -Tag 0.1.1
#>
[CmdletBinding()]
param(
  [string]$Tag = '',
  [string]$OutputDir = 'build'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw '找不到 npm，请先安装 Node.js。'
  }

  # 录制依赖来自同级 SDK 的 file: 包，构建前必须已有 dist。
  $replayDist = Join-Path $repoRoot 'node_modules\@weils-monitor\replay\dist\index.mjs'
  if (-not (Test-Path $replayDist)) {
    throw '缺少 @weils-monitor/replay 构建产物：先在 ../weils-monitor 执行 pnpm install && pnpm build'
  }

  if (-not $Tag) {
    $pkg = Get-Content -Raw -Path (Join-Path $repoRoot 'package.json') | ConvertFrom-Json
    $Tag = "$($pkg.version)-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  }
  if ($Tag -notmatch '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$') {
    throw "非法 tag: $Tag（只允许字母、数字、下划线、点和短横线）"
  }

  if (-not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
    Write-Host '[1/3] 安装依赖 npm ci ...'
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci 失败' }
  }

  Write-Host '[1/3] 构建 dist（vue-tsc + vite build）...'
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw 'npm run build 失败' }
  if (-not (Test-Path (Join-Path $repoRoot 'dist\index.html'))) {
    throw '构建后缺少 dist/index.html'
  }

  Write-Host '[2/3] 打包 dist ...'
  $outDir = Join-Path $repoRoot $OutputDir
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
  $tarPath = Join-Path $outDir "monitor-frontend-dist-$Tag.tar"
  $gzPath = "$tarPath.gz"
  if (Test-Path $gzPath) { Remove-Item -LiteralPath $gzPath -Force }

  & tar -czf $gzPath -C (Join-Path $repoRoot 'dist') .
  if ($LASTEXITCODE -ne 0) { throw 'tar -czf 失败' }

  $hash = (Get-FileHash -LiteralPath $gzPath -Algorithm SHA256).Hash.ToLowerInvariant()
  # 供服务器端 sha256sum -c 使用，必须是 LF。
  [System.IO.File]::WriteAllText("$gzPath.sha256", "$hash  monitor-frontend-dist-$Tag.tar.gz`n")

  Write-Host '[3/3] 完成：' -ForegroundColor Green
  Write-Host "  $gzPath"
  Write-Host "  SHA256: $hash"
  Write-Host ''
  Write-Host '下一步：上传 dist 包、部署脚本和 nginx 配置：'
  Write-Host "  scp `"$gzPath`" `"$gzPath.sha256`" deploy/deploy-dist.sh deploy/nginx.conf root@<server>:/opt/monitor-frontend/"
  Write-Host '然后在服务器上：'
  Write-Host '  cd /opt/monitor-frontend'
  Write-Host "  sha256sum -c monitor-frontend-dist-$Tag.tar.gz.sha256"
  Write-Host "  bash deploy-dist.sh monitor-frontend-dist-$Tag.tar.gz"
}
finally {
  Pop-Location
}
