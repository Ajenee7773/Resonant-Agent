[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $true)]
  [string]$WindowsLauncher,

  [string]$Root = (Join-Path $env:USERPROFILE "AlignedAI\ResidentAgents"),
  [switch]$InstallDesktopStarter
)

$ErrorActionPreference = "Stop"
$Root = [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($Root))
$WindowsLauncher = [IO.Path]::GetFullPath(
  [Environment]::ExpandEnvironmentVariables($WindowsLauncher)
)
$configPath = Join-Path $Root "resident-agents.json"

New-Item -ItemType Directory -Force -Path $Root | Out-Null

$document = [ordered]@{
  format = "aligned-resident-agents"
  version = 1
  agents = @()
}
if (Test-Path -LiteralPath $configPath -PathType Leaf) {
  $existing = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
  if ($existing.format -and $existing.format -ne "aligned-resident-agents") {
    throw "Unsupported resident-agent configuration: $configPath"
  }
  $document.agents = @($existing.agents)
}

$normalized = $WindowsLauncher.ToLowerInvariant()
$updated = $false
for ($index = 0; $index -lt $document.agents.Count; $index += 1) {
  $candidate = [Environment]::ExpandEnvironmentVariables(
    [string]$document.agents[$index].windows_launcher
  )
  if ($candidate -and [IO.Path]::GetFullPath($candidate).ToLowerInvariant() -eq $normalized) {
    $document.agents[$index].name = $Name
    $document.agents[$index].enabled = $true
    $document.agents[$index].windows_launcher = $WindowsLauncher
    $updated = $true
    break
  }
}
if (-not $updated) {
  $document.agents += [pscustomobject][ordered]@{
    name = $Name
    enabled = $true
    windows_launcher = $WindowsLauncher
  }
}

$temporary = "$configPath.$PID.tmp"
$document | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $temporary -Encoding UTF8
Move-Item -LiteralPath $temporary -Destination $configPath -Force

if ($InstallDesktopStarter) {
  $desktop = [Environment]::GetFolderPath("Desktop")
  if ($desktop) {
    $desktopLauncher = @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$Root\start-resident-agents.ps1"
if errorlevel 1 pause
"@
    $desktopLauncher | Set-Content -LiteralPath (Join-Path $desktop "Start Resident Agents.bat") -Encoding ASCII
  }
}

Write-Host "Registered $Name in $configPath"
