@echo off
setlocal

if not "%RESONANT_HOME%"=="" (
  set "PI_HOME=%RESONANT_HOME%"
) else (
  set "PI_HOME=%USERPROFILE%\.resonant"
)
set "PI_CODING_AGENT_DIR=%PI_HOME%\agent"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run the RESONANT Agent local UI.
  exit /b 1
)

node "%~dp0scripts\session-retention.js" --home "%PI_HOME%" --max-age-days 15 >nul 2>nul
if errorlevel 1 echo Warning: old session cleanup could not finish. RESONANT Agent UI will still start.

node "%~dp0ui\server.js"

endlocal
