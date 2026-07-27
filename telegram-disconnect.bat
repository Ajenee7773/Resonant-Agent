@echo off
setlocal

if not "%RESONANT_HOME%"=="" (
  set "PI_HOME=%RESONANT_HOME%"
) else if not "%ALIGNED_AGENT_HOME%"=="" (
  set "PI_HOME=%ALIGNED_AGENT_HOME%"
) else (
  set "PI_HOME=%USERPROFILE%\.resonant"
)
set "RESONANT_HOME=%PI_HOME%"
set "ALIGNED_AGENT_HOME=%PI_HOME%"
set "PI_CODING_AGENT_DIR=%PI_HOME%\agent"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required for Telegram disconnect.
  exit /b 1
)

node "%~dp0telegram\disconnect.js"

endlocal
