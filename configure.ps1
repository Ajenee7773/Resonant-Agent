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

$PiAgentDir = Join-Path $env:PI_HOME "agent"
$env:PI_CODING_AGENT_DIR = $PiAgentDir
$env:AGENTS_FILE = Join-Path $PiAgentDir "AGENTS.md"
$env:AUTH_FILE = Join-Path $PiAgentDir "auth.json"
$env:MODELS_FILE = Join-Path $PiAgentDir "models.json"
$env:SETTINGS_FILE = Join-Path $PiAgentDir "settings.json"

if (-not (Test-Path -LiteralPath $PiAgentDir)) {
  throw "ERROR: $PiAgentDir does not exist. Run install.ps1 first."
}

if (-not (Test-Path -LiteralPath $env:AGENTS_FILE)) {
  throw "ERROR: $env:AGENTS_FILE does not exist. Run install.ps1 first."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "ERROR: Node.js is required for configuration."
}

function Prompt-Default($Label, $Default) {
  $value = Read-Host "$Label [$Default]"
  if ($value) { return $value }
  return $Default
}

Write-Host "RESONANT Agent configuration"
Write-Host "Model mode:"
Write-Host "  1. Ollama local"
Write-Host "  2. Cloud provider"
$modelChoice = Read-Host "Choose 1 or 2 [1]"
if (-not $modelChoice) { $modelChoice = "1" }

if ($modelChoice -eq "1") {
  $env:RESONANT_PROVIDER = "ollama"
  $env:RESONANT_MODEL = Prompt-Default "Ollama model" "llama3.1:8b"

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
    Write-Host "Ollama is installed but not running. Start it first, then re-run configure."
    exit 1
  }

  Write-Host "Pulling Ollama model $env:RESONANT_MODEL..."
  & ollama pull $env:RESONANT_MODEL
} else {
  $env:RESONANT_PROVIDER = Prompt-Default "Cloud provider id" "openai"
  $env:RESONANT_MODEL = Prompt-Default "Model name" "gpt-4.1-mini"
  $env:RESONANT_API_KEY = Read-Host "API key"
}

$env:RESONANT_OPERATOR_NAME = Prompt-Default "Operator name" "Operator"
$env:RESONANT_AGENT_NAME = Prompt-Default "Agent name" "Resonant"
$env:RESONANT_MISSION = Prompt-Default "Mission" "Help the operator think, build, create, and act with clarity."

& node "$ScriptDir\scripts\write-config.js"

Write-Host ""
Write-Host "Configuration complete."
Write-Host "Agent file: $env:AGENTS_FILE"
Write-Host "Auth file: $env:AUTH_FILE"
Write-Host "Start with: .\start.ps1"

$telegram = Read-Host "Connect Telegram now? [y/N]"
if ($telegram -and $telegram.ToLower() -eq "y") {
  if (Test-Path -LiteralPath "$ScriptDir\telegram\setup.js") {
    & node "$ScriptDir\telegram\setup.js"
  } else {
    Write-Host "Telegram setup is not packaged in this build."
  }
}
