param(
  [string]$Repo = $env:RESONANT_REPO,
  [string]$Ref = $(if ($env:RESONANT_REF) { $env:RESONANT_REF } else { "main" }),
  [string]$ZipUrl = $env:RESONANT_ZIP_URL
)

$ErrorActionPreference = "Stop"

if (-not $Repo) {
  $Repo = "Ajenee7773/Resonant-Agent"
}

$PiPackage = "@mariozechner/pi-coding-agent@0.69.0"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) {
  $ScriptDir = (Get-Location).Path
}
$HarnessDir = Join-Path $ScriptDir "harness"

if ($env:RESONANT_HOME) {
  $env:PI_HOME = $env:RESONANT_HOME
} else {
  $env:PI_HOME = Join-Path $env:USERPROFILE ".resonant"
}
$PiHome = $env:PI_HOME
$PiAgentDir = Join-Path $PiHome "agent"
$PiWorkspaceDir = Join-Path $PiHome "workspace"
$AgentsSkillsDir = if ($env:AGENTS_SKILLS_DIR) { $env:AGENTS_SKILLS_DIR } else { Join-Path $PiAgentDir "skills" }
$PiAppDir = Join-Path $PiHome "app"
$PiBinDir = Join-Path $PiHome "bin"
$env:PI_CODING_AGENT_DIR = $PiAgentDir

function Write-Step($Message) {
  Write-Host $Message
}

function Fail($Message) {
  throw "ERROR: $Message"
}

function Copy-DirContents($Source, $Destination) {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  if (Test-Path -LiteralPath $Source) {
    Get-ChildItem -LiteralPath $Source -Force | Copy-Item -Destination $Destination -Recurse -Force
  }
}

function Download-RepoIfNeeded {
  if (Test-Path -LiteralPath $HarnessDir) {
    return
  }

  Write-Step "Harness folder not found beside installer."
  Write-Step "Assuming remote one-line install; downloading RESONANT release files..."

  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("resonant-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $zip = Join-Path $tmp "resonant.zip"
  if (-not $ZipUrl) {
    $ZipUrl = "https://github.com/$Repo/archive/refs/heads/$Ref.zip"
  }

  Write-Step "Downloading $ZipUrl"
  Invoke-WebRequest -Uri $ZipUrl -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force

  $found = Get-ChildItem -LiteralPath $tmp -Directory -Recurse -Filter "harness" | Select-Object -First 1
  if (-not $found) {
    Fail "Downloaded archive did not contain a harness/ directory."
  }

  $script:ScriptDir = Split-Path -Parent $found.FullName
  $script:HarnessDir = $found.FullName
}

function Check-Node {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js is not installed. Install Node.js 18+ and run this again."
  }
  $major = & node -e "process.stdout.write(process.versions.node.split('.')[0])"
  if ([int]$major -lt 18) {
    Fail "Node.js 18+ is required. Current version: $(node -v)"
  }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail "npm is not installed or not on PATH."
  }
}

function Check-File($Path, $Label) {
  $script:HealthTotal += 1
  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    $script:HealthPresent += 1
    Write-Host "[OK] $Label"
  } else {
    Write-Host "[MISSING] $Label"
    Write-Host "WARNING: $Label is missing. The agent may not boot correctly."
  }
}

function Check-NonEmptyDir($Path, $Label) {
  $script:HealthTotal += 1
  if ((Test-Path -LiteralPath $Path -PathType Container) -and (Get-ChildItem -LiteralPath $Path -Force | Select-Object -First 1)) {
    $script:HealthPresent += 1
    Write-Host "[OK] $Label"
  } else {
    Write-Host "[MISSING] $Label"
    Write-Host "WARNING: $Label is missing. The agent may not boot correctly."
  }
}

Write-Step "RESONANT Agent installer"
Download-RepoIfNeeded
Write-Step "Checking Node.js..."
Check-Node

if ((Get-Command pi -ErrorAction SilentlyContinue) -and $env:RESONANT_FORCE_PI_INSTALL -ne "1") {
  Write-Step "Pi runtime already found on PATH; leaving the existing global install untouched."
} else {
  Write-Step "Installing Pi runtime: $PiPackage"
  npm install -g $PiPackage
}

Write-Step "Creating directories..."
foreach ($dir in @(
  "$PiAgentDir\extensions",
  "$PiAgentDir\memory",
  "$PiAgentDir\memories",
  "$PiAgentDir\sessions",
  "$PiWorkspaceDir\persona",
  "$PiWorkspaceDir\rooms",
  $AgentsSkillsDir,
  $PiAppDir,
  $PiBinDir
)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Step "Copying harness files..."
if (Test-Path -LiteralPath "$HarnessDir\AGENTS.md") {
  if (Test-Path -LiteralPath "$PiAgentDir\AGENTS.md") {
    Copy-Item -LiteralPath "$PiAgentDir\AGENTS.md" -Destination "$PiAgentDir\AGENTS.md.bak.$(Get-Random)" -Force
  }
  Copy-Item -LiteralPath "$HarnessDir\AGENTS.md" -Destination "$PiAgentDir\AGENTS.md" -Force
}

foreach ($file in @("SOUL.md","CONSTITUTION.md","FOUNDATION.md","HEARTBEAT.md","MEMORY.md","TOOLS.md","ROOMS.md","TRANSFER.md")) {
  $src = Join-Path $HarnessDir $file
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $PiAgentDir $file) -Force
  }
}

if ((Test-Path -LiteralPath "$HarnessDir\settings.json") -and -not (Test-Path -LiteralPath "$PiAgentDir\settings.json")) {
  Copy-Item -LiteralPath "$HarnessDir\settings.json" -Destination "$PiAgentDir\settings.json" -Force
}

if ((Test-Path -LiteralPath "$HarnessDir\heartbeat.json") -and -not (Test-Path -LiteralPath "$PiAgentDir\heartbeat.json")) {
  Copy-Item -LiteralPath "$HarnessDir\heartbeat.json" -Destination "$PiAgentDir\heartbeat.json" -Force
}

if (-not (Test-Path -LiteralPath "$PiAgentDir\auth.json")) {
  "{}" | Set-Content -Path "$PiAgentDir\auth.json" -Encoding UTF8
}

Copy-DirContents "$HarnessDir\boot" "$PiAgentDir\boot"
Copy-DirContents "$HarnessDir\extensions" "$PiAgentDir\extensions"
Copy-DirContents "$HarnessDir\memory" "$PiAgentDir\memory"
Copy-DirContents "$HarnessDir\persona" "$PiWorkspaceDir\persona"
Copy-DirContents "$HarnessDir\rooms" "$PiWorkspaceDir\rooms"
Copy-DirContents "$HarnessDir\skills" $AgentsSkillsDir

if (Test-Path -LiteralPath "$HarnessDir\os-skill") {
  Copy-DirContents "$HarnessDir\os-skill" "$AgentsSkillsDir\resonant-os"
}

Write-Step "Copying RESONANT Agent launchers..."
Copy-DirContents "$ScriptDir\bridge" "$PiAppDir\bridge"
Copy-DirContents "$ScriptDir\scripts" "$PiAppDir\scripts"
Copy-DirContents "$ScriptDir\ui" "$PiAppDir\ui"
Copy-DirContents "$ScriptDir\heartbeat" "$PiAppDir\heartbeat"
Copy-DirContents "$ScriptDir\telegram" "$PiAppDir\telegram"

foreach ($file in @("install.bat","install.ps1","configure.bat","configure.ps1","start.bat","start.ps1","ui.bat","heartbeat-start.bat","heartbeat-start.ps1","telegram-setup.bat","telegram-start.bat","package.json","README.md","RELEASE.md")) {
  $src = Join-Path $ScriptDir $file
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $PiAppDir $file) -Force
  }
}

$psLauncher = @"
`$env:RESONANT_HOME = "$PiHome"
`$env:PI_HOME = "$PiHome"
`$env:PI_CODING_AGENT_DIR = "$PiAgentDir"
& "$PiAppDir\start.ps1" @args
"@
$psLauncher | Set-Content -Path (Join-Path $PiBinDir "resonant.ps1") -Encoding UTF8

$batLauncher = @"
@echo off
set "RESONANT_HOME=$PiHome"
set "PI_HOME=$PiHome"
set "PI_CODING_AGENT_DIR=$PiAgentDir"
call "$PiAppDir\start.bat" %*
"@
$batLauncher | Set-Content -Path (Join-Path $PiBinDir "resonant.bat") -Encoding ASCII

$psHeartbeatLauncher = @"
`$env:RESONANT_HOME = "$PiHome"
`$env:PI_HOME = "$PiHome"
`$env:PI_CODING_AGENT_DIR = "$PiAgentDir"
& "$PiAppDir\heartbeat-start.ps1" @args
"@
$psHeartbeatLauncher | Set-Content -Path (Join-Path $PiBinDir "resonant-heartbeat.ps1") -Encoding UTF8

$batHeartbeatLauncher = @"
@echo off
set "RESONANT_HOME=$PiHome"
set "PI_HOME=$PiHome"
set "PI_CODING_AGENT_DIR=$PiAgentDir"
call "$PiAppDir\heartbeat-start.bat" %*
"@
$batHeartbeatLauncher | Set-Content -Path (Join-Path $PiBinDir "resonant-heartbeat.bat") -Encoding ASCII

Write-Step "Checking pi command..."
if (Get-Command pi -ErrorAction SilentlyContinue) {
  Write-Step "pi command is available."
} else {
  Write-Step "pi command was not found on PATH after install."
  Write-Step "Restart your terminal or add npm's global bin directory to PATH."
}

Write-Host ""
Write-Step "Health check:"
$script:HealthTotal = 0
$script:HealthPresent = 0
Check-File "$PiAgentDir\AGENTS.md" "~/.resonant/agent/AGENTS.md"
Check-File "$PiAgentDir\SOUL.md" "~/.resonant/agent/SOUL.md"
Check-File "$PiAgentDir\CONSTITUTION.md" "~/.resonant/agent/CONSTITUTION.md"
Check-File "$PiAgentDir\FOUNDATION.md" "~/.resonant/agent/FOUNDATION.md"
Check-File "$PiAgentDir\HEARTBEAT.md" "~/.resonant/agent/HEARTBEAT.md"
Check-File "$PiAgentDir\heartbeat.json" "~/.resonant/agent/heartbeat.json"
Check-File "$PiAgentDir\MEMORY.md" "~/.resonant/agent/MEMORY.md"
Check-File "$PiAgentDir\TOOLS.md" "~/.resonant/agent/TOOLS.md"
Check-File "$PiAgentDir\ROOMS.md" "~/.resonant/agent/ROOMS.md"
Check-File "$PiAgentDir\boot\BOOT.md" "~/.resonant/agent/boot/BOOT.md"
Check-File "$PiWorkspaceDir\persona\IDENTITY.md" "~/.resonant/workspace/persona/IDENTITY.md"
Check-File "$PiWorkspaceDir\persona\USER.md" "~/.resonant/workspace/persona/USER.md"
Check-NonEmptyDir "$PiWorkspaceDir\rooms" "~/.resonant/workspace/rooms/"

if ($HealthPresent -eq $HealthTotal) {
  Write-Host "Health check: $HealthPresent/$HealthTotal files present. Ready to configure."
} else {
  Write-Host "Health check: $HealthPresent/$HealthTotal files present. Issues found - check above."
}

Write-Host ""
Write-Step "RESONANT Agent installed."
Write-Step "Next steps:"
Write-Step "  1. Run $PiAppDir\configure.ps1"
Write-Step "  2. Start RESONANT Agent with: $PiAppDir\start.ps1"
Write-Step "  3. Optional launcher: $PiBinDir\resonant.ps1"
Write-Step "  4. Optional heartbeats: $PiAppDir\heartbeat-start.ps1"
Write-Step "  5. Edit $PiAgentDir\AGENTS.md to customize the resident identity."
if ($env:RESONANT_SKIP_CONFIG_PROMPT -ne "1" -and (Test-Path -LiteralPath "$PiAppDir\configure.ps1")) {
  $answer = Read-Host "Run configuration now? [Y/n]"
  if (-not $answer -or $answer.ToLower() -ne "n") {
    & "$PiAppDir\configure.ps1"
  }
}
