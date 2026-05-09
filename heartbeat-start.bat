@echo off
setlocal

if not "%RESONANT_HOME%"=="" (
  set "PI_HOME=%RESONANT_HOME%"
) else (
  set "PI_HOME=%USERPROFILE%\.resonant"
)
set "RESONANT_HOME=%PI_HOME%"
set "PI_CODING_AGENT_DIR=%PI_HOME%\agent"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run RESONANT heartbeats.
  exit /b 1
)

node "%~dp0heartbeat\runner.js" %*

endlocal
