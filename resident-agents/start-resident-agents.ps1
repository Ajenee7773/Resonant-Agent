[CmdletBinding()]
param(
  [string]$Config = (Join-Path $PSScriptRoot "resident-agents.json"),
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-LauncherPath([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }
  $expanded = [Environment]::ExpandEnvironmentVariables($Value)
  if ($expanded -eq "~") {
    $expanded = $env:USERPROFILE
  } elseif ($expanded.StartsWith("~\") -or $expanded.StartsWith("~/")) {
    $expanded = Join-Path $env:USERPROFILE $expanded.Substring(2)
  }
  return [IO.Path]::GetFullPath($expanded)
}

function Start-ResidentLauncher([string]$Launcher) {
  $extension = [IO.Path]::GetExtension($Launcher).ToLowerInvariant()
  switch ($extension) {
    ".ps1" {
      $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$Launcher`""
      Start-Process -FilePath "powershell.exe" -ArgumentList $arguments | Out-Null
    }
    ".bat" {
      Start-Process -FilePath $env:COMSPEC -ArgumentList "/d /c `"$Launcher`"" | Out-Null
    }
    ".cmd" {
      Start-Process -FilePath $env:COMSPEC -ArgumentList "/d /c `"$Launcher`"" | Out-Null
    }
    default {
      Start-Process -FilePath $Launcher | Out-Null
    }
  }
}

if (-not (Test-Path -LiteralPath $Config -PathType Leaf)) {
  Write-Error "Resident-agent configuration was not found: $Config"
  exit 1
}

try {
  $document = Get-Content -LiteralPath $Config -Raw | ConvertFrom-Json
} catch {
  Write-Error "Resident-agent configuration is not valid JSON: $Config"
  exit 1
}

$agents = @($document.agents | Where-Object { $_.enabled -ne $false })
if ($agents.Count -eq 0) {
  Write-Error "No enabled resident agents are registered in $Config"
  exit 1
}

$started = 0
$failed = 0
foreach ($agent in $agents) {
  $name = if ([string]::IsNullOrWhiteSpace([string]$agent.name)) {
    "Resident Agent"
  } else {
    [string]$agent.name
  }
  $launcher = Resolve-LauncherPath ([string]$agent.windows_launcher)
  if (-not $launcher -or -not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
    Write-Warning "$name was not started because its launcher is missing: $launcher"
    $failed += 1
    continue
  }

  if ($DryRun) {
    Write-Host "[READY] $name -> $launcher"
  } else {
    Start-ResidentLauncher $launcher
    Write-Host "[STARTED] $name"
  }
  $started += 1
}

if ($DryRun) {
  Write-Host "Resident-agent check complete: $started ready, $failed unavailable."
} else {
  Write-Host "Resident agents started: $started. Unavailable: $failed."
}

if ($started -eq 0) {
  exit 1
}
exit 0
