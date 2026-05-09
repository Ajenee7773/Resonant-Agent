$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) {
  $ScriptDir = (Get-Location).Path
}

if ($env:RESONANT_HOME) {
  $env:PI_HOME = $env:RESONANT_HOME
} else {
  $env:PI_HOME = Join-Path $env:USERPROFILE ".resonant"
}
$env:RESONANT_HOME = $env:PI_HOME
$env:PI_CODING_AGENT_DIR = Join-Path $env:PI_HOME "agent"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is required to run RESONANT heartbeats."
  exit 1
}

& node "$ScriptDir\heartbeat\runner.js" @args
