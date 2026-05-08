@echo off
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
if not "%RESONANT_HOME%"=="" (
  set "PI_HOME=%RESONANT_HOME%"
) else (
  set "PI_HOME=%USERPROFILE%\.resonant"
)
set "AGENTS_FILE=%PI_HOME%\agent\AGENTS.md"
set "AUTH_FILE=%PI_HOME%\agent\auth.json"
set "PI_CODING_AGENT_DIR=%PI_HOME%\agent"

echo RESONANT Agent start

where pi >nul 2>nul
if errorlevel 1 (
  echo Pi runtime is not installed yet. Installing RESONANT Agent now...
  call "%SCRIPT_DIR%install.bat"
  if errorlevel 1 exit /b 1
  echo Install finished. Starting configuration...
  call "%SCRIPT_DIR%configure.bat"
  if errorlevel 1 exit /b 1
) else (
  call :CheckConfigured
  if "!CONFIGURED!"=="0" (
    echo RESONANT Agent is installed, but the harness is not configured yet.
    echo Running configuration now...
    call "%SCRIPT_DIR%configure.bat"
    if errorlevel 1 exit /b 1
  ) else (
    echo Pi runtime is installed and the RESONANT Agent harness is configured.
  )
)

call :CheckOllamaIfNeeded
if errorlevel 1 exit /b 1

where pi >nul 2>nul
if errorlevel 1 (
  echo pi command is still not available on PATH.
  echo Restart your terminal or add npm's global bin directory to PATH, then run this script again.
  exit /b 1
)

echo Opening RESONANT Agent...
call :LoadAuthEnv
if not exist "%PI_HOME%\workspace" mkdir "%PI_HOME%\workspace"
pushd "%PI_HOME%\workspace"
call pi
set "PI_EXIT=%ERRORLEVEL%"
popd
exit /b %PI_EXIT%

:CheckConfigured
set "CONFIGURED=0"
if not exist "%AGENTS_FILE%" exit /b 0
for %%A in ("%AGENTS_FILE%") do if %%~zA LEQ 0 exit /b 0
findstr /C:"{{AGENT_NAME}}" /C:"{{OPERATOR_NAME}}" /C:"{{MISSION}}" "%AGENTS_FILE%" >nul 2>nul
if errorlevel 1 set "CONFIGURED=1"
exit /b 0

:CheckOllamaIfNeeded
set "OLLAMA_NEEDED="
if not exist "%AUTH_FILE%" exit /b 0
for /f "delims=" %%O in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $auth=Get-Content -Raw $env:AUTH_FILE | ConvertFrom-Json; if ($auth.provider -eq 'ollama') { 'yes' } } catch { }"') do set "OLLAMA_NEEDED=%%O"
if /I not "!OLLAMA_NEEDED!"=="yes" exit /b 0

echo Ollama model configuration detected.
where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama is not installed. Download it from https://ollama.com/download
  set /p OPEN_OLLAMA="Open the download page now? [Y/n]: "
  if /I not "!OPEN_OLLAMA!"=="n" start "" "https://ollama.com/download"
  exit /b 1
)

ollama list >nul 2>nul
if errorlevel 1 (
  echo Ollama is installed but not running. Start it first, then run start.bat again.
  exit /b 1
)
exit /b 0

:LoadAuthEnv
for /f "tokens=1,* delims==" %%A in ('node "%SCRIPT_DIR%scripts\auth-env.js" 2^>nul') do (
  set "%%A=%%B"
)
exit /b 0
