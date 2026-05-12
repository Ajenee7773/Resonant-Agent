@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
if not "%RESONANT_HOME%"=="" (
  set "PI_HOME=%RESONANT_HOME%"
) else (
  set "PI_HOME=%USERPROFILE%\.resonant"
)
set "PI_AGENT_DIR=%PI_HOME%\agent"
set "AGENTS_FILE=%PI_AGENT_DIR%\AGENTS.md"
set "AUTH_FILE=%PI_AGENT_DIR%\auth.json"
set "MODELS_FILE=%PI_AGENT_DIR%\models.json"
set "SETTINGS_FILE=%PI_AGENT_DIR%\settings.json"
set "PI_CODING_AGENT_DIR=%PI_AGENT_DIR%"

if not exist "%PI_AGENT_DIR%" (
  echo ERROR: %PI_AGENT_DIR% does not exist. Run install.bat first.
  exit /b 1
)

if not exist "%AGENTS_FILE%" (
  echo ERROR: %AGENTS_FILE% does not exist. Run install.bat first.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is required for configuration.
  exit /b 1
)

echo RESONANT Agent configuration
echo Model mode:
echo   1. Ollama local
echo   2. Cloud provider
set /p MODEL_CHOICE="Choose 1 or 2 [1]: "
if "%MODEL_CHOICE%"=="" set "MODEL_CHOICE=1"

if "%MODEL_CHOICE%"=="1" (
  set "RESONANT_PROVIDER=ollama"
  set /p RESONANT_MODEL="Ollama model [llama3.1:8b]: "
  if "!RESONANT_MODEL!"=="" set "RESONANT_MODEL=llama3.1:8b"
  where ollama >nul 2>nul
  if errorlevel 1 (
    echo Ollama is not installed. Download it from https://ollama.com/download
    set /p OPEN_OLLAMA="Open the download page now? [Y/n]: "
    if /I not "!OPEN_OLLAMA!"=="n" start "" "https://ollama.com/download"
    exit /b 1
  ) else (
    ollama list >nul 2>nul
    if errorlevel 1 (
      echo Ollama is installed but not running. Start it first, then re-run configure.
      exit /b 1
    ) else (
      echo Pulling Ollama model !RESONANT_MODEL!...
      ollama pull "!RESONANT_MODEL!"
    )
  )
) else (
  set /p RESONANT_PROVIDER="Cloud provider id [openai]: "
  if "!RESONANT_PROVIDER!"=="" set "RESONANT_PROVIDER=openai"
  set /p RESONANT_MODEL="Model name [gpt-4.1-mini]: "
  if "!RESONANT_MODEL!"=="" set "RESONANT_MODEL=gpt-4.1-mini"
  set /p RESONANT_API_KEY="API key: "
)

set /p RESONANT_CONTEXT_WINDOW="Context window tokens [1000000]: "
if "!RESONANT_CONTEXT_WINDOW!"=="" set "RESONANT_CONTEXT_WINDOW=1000000"
set "RESONANT_CONTEXT_WINDOW=!RESONANT_CONTEXT_WINDOW:,=!"
set /p RESONANT_MAX_TOKENS="Max output tokens [16384]: "
if "!RESONANT_MAX_TOKENS!"=="" set "RESONANT_MAX_TOKENS=16384"
set "RESONANT_MAX_TOKENS=!RESONANT_MAX_TOKENS:,=!"
set /p RESONANT_OPERATOR_NAME="Operator name [Operator]: "
if "!RESONANT_OPERATOR_NAME!"=="" set "RESONANT_OPERATOR_NAME=Operator"
set /p RESONANT_AGENT_NAME="Agent name [Resonant]: "
if "!RESONANT_AGENT_NAME!"=="" set "RESONANT_AGENT_NAME=Resonant"
set /p RESONANT_MISSION="Mission [Help the operator think, build, create, and act with clarity.]: "
if "!RESONANT_MISSION!"=="" set "RESONANT_MISSION=Help the operator think, build, create, and act with clarity."

node "%SCRIPT_DIR%scripts\write-config.js"
if errorlevel 1 exit /b 1

echo.
echo Configuration complete.
echo Agent file: %AGENTS_FILE%
echo Auth file: %AUTH_FILE%
echo Start with: start.bat

echo.
set /p TELEGRAM_CHOICE="Connect Telegram now? [y/N]: "
if /I "!TELEGRAM_CHOICE!"=="y" (
  if exist "%SCRIPT_DIR%telegram\setup.js" (
    node "%SCRIPT_DIR%telegram\setup.js"
  ) else (
    echo Telegram setup is not packaged in this build.
  )
)

endlocal
