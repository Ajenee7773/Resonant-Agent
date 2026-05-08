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

$AgentsFile = Join-Path $env:PI_HOME "agent\AGENTS.md"
$AuthFile = Join-Path $env:PI_HOME "agent\auth.json"
$env:PI_CODING_AGENT_DIR = Join-Path $env:PI_HOME "agent"

function Is-Configured {
  if (-not (Test-Path -LiteralPath $AgentsFile)) { return $false }
  $text = Get-Content -Raw -LiteralPath $AgentsFile
  if (-not $text.Trim()) { return $false }
  return ($text -notmatch "\{\{(AGENT_NAME|OPERATOR_NAME|MISSION)\}\}")
}

function Load-AuthEnv {
  $line = & node "$ScriptDir\scripts\auth-env.js" 2>$null
  if ($line -and $line.Contains("=")) {
    $name, $value = $line.Split("=", 2)
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Write-Host "RESONANT Agent start"

if (-not (Get-Command pi -ErrorAction SilentlyContinue)) {
  Write-Host "Pi runtime is not installed yet. Installing RESONANT Agent now..."
  $previousSkip = $env:RESONANT_SKIP_CONFIG_PROMPT
  $env:RESONANT_SKIP_CONFIG_PROMPT = "1"
  & "$ScriptDir\install.ps1"
  if ($null -eq $previousSkip) {
    Remove-Item Env:RESONANT_SKIP_CONFIG_PROMPT -ErrorAction SilentlyContinue
  } else {
    $env:RESONANT_SKIP_CONFIG_PROMPT = $previousSkip
  }
  Write-Host "Install finished. Starting configuration..."
  & "$ScriptDir\configure.ps1"
} elseif (-not (Is-Configured)) {
  Write-Host "RESONANT Agent is installed, but the harness is not configured yet."
  Write-Host "Running configuration now..."
  & "$ScriptDir\configure.ps1"
} else {
  Write-Host "Pi runtime is installed and the RESONANT Agent harness is configured."
}

if (Test-Path -LiteralPath $AuthFile) {
  $auth = Get-Content -Raw -LiteralPath $AuthFile | ConvertFrom-Json
  if ($auth.provider -eq "ollama") {
    Write-Host "Ollama model configuration detected."
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
      Write-Host "Ollama is not installed. Download it from https://ollama.com/download"
      $open = Read-Host "Open the download page now? [Y/n]"
      if (-not $open -or $open.ToLower() -ne "n") {
        Start-Process "https://ollama.com/download"
      }
      exit 1
    }
    & ollama list *> $null
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Ollama is installed but not running. Start it first, then run start.ps1 again."
      exit 1
    }
  }
}

if (-not (Get-Command pi -ErrorAction SilentlyContinue)) {
  Write-Host "pi command is still not available on PATH."
  Write-Host "Restart your terminal or add npm's global bin directory to PATH, then run this script again."
  exit 1
}

Load-AuthEnv
Write-Host "Opening RESONANT Agent..."
New-Item -ItemType Directory -Force -Path (Join-Path $env:PI_HOME "workspace") | Out-Null
Set-Location (Join-Path $env:PI_HOME "workspace")
& pi
