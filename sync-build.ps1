param([switch]$NoZip)

$ErrorActionPreference = "Stop"
$projRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $projRoot "build\Lulu-Time-Tracker"
$zipOut  = Join-Path $projRoot "build\LuluTimeTracker-v1.0.2.zip"

$ver = "1.0.2"
try { $pkg = Get-Content (Join-Path $projRoot "package.json") -Raw | ConvertFrom-Json; $ver = $pkg.version } catch {}
$zipOut = Join-Path $projRoot "build\LuluTimeTracker-v$ver.zip"

Write-Host "=== Syncing build (v$ver) ===" -ForegroundColor Cyan

# Clean and recreate
if (Test-Path $buildDir) { Remove-Item $buildDir -Recurse -Force }
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null

# Copy project files (exclude .git, backups, build, lnk, node_modules/.cache)
$exclude = @('.git', 'backups', 'build', 'sync-build.ps1', 'LuluTimeTracker.lnk')
Get-ChildItem $projRoot -Force | ForEach-Object {
  $skip = $false
  foreach ($pat in $exclude) { if ($_.Name -like $pat) { $skip = $true; break } }
  if ($skip) { Write-Host "  SKIP $($_.Name)" -ForegroundColor Gray; return }
  Write-Host "  COPY $($_.Name)" -ForegroundColor Green
  Copy-Item $_.FullName (Join-Path $buildDir $_.Name) -Recurse -Force
}

# Replace data.json with fresh empty one
Set-Content (Join-Path $buildDir "data.json") '{"logs":[],"schedules":{},"ideas":[],"memos":[],"reflections":{},"timerState":"idle","timerStartTime":null,"timerSessionStart":null,"timerElapsedMs":0,"timerCategory":null,"timerDescription":"","zoomLevel":1.0}' -Encoding UTF8

# Remove node_modules/.cache if exists
$cacheDir = Join-Path $buildDir "node_modules\.cache"
if (Test-Path $cacheDir) { Remove-Item $cacheDir -Recurse -Force }

# Rebuild zip
if (-not $NoZip) {
  Write-Host "`n=== Building ZIP ===" -ForegroundColor Cyan
  if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
  Compress-Archive -Path "$buildDir\*" -DestinationPath $zipOut -CompressionLevel Optimal
  $sizeMB = [math]::Round((Get-Item $zipOut).Length / 1MB, 1)
  Write-Host "  $zipOut ($sizeMB MB)" -ForegroundColor Green
}

Write-Host "`n=== Done ===" -ForegroundColor Green
