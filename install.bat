@echo off
setlocal enabledelayedexpansion

set "PI_PACKAGE=@mariozechner/pi-coding-agent@0.69.0"
set "SCRIPT_DIR=%~dp0"
set "HARNESS_DIR=%SCRIPT_DIR%harness"

if not "%RESONANT_HOME%"=="" (
  set "PI_HOME=%RESONANT_HOME%"
) else (
  set "PI_HOME=%USERPROFILE%\.resonant"
)
set "PI_AGENT_DIR=%PI_HOME%\agent"
set "PI_WORKSPACE_DIR=%PI_HOME%\workspace"
if "%AGENTS_SKILLS_DIR%"=="" set "AGENTS_SKILLS_DIR=%PI_AGENT_DIR%\skills"
set "PI_APP_DIR=%PI_HOME%\app"
set "PI_BIN_DIR=%PI_HOME%\bin"
set "PI_CODING_AGENT_DIR=%PI_AGENT_DIR%"

echo RESONANT Agent installer
echo Checking Node.js...

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Install Node.js 18+ and run this again.
  exit /b 1
)

node -e "const major=Number(process.versions.node.split('.')[0]); if (major < 18) process.exit(1)"
if errorlevel 1 (
  echo ERROR: Node.js 18+ is required.
  node -v
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not installed or not on PATH.
  exit /b 1
)

set "INSTALL_PI=1"
where pi >nul 2>nul
if not errorlevel 1 if not "%RESONANT_FORCE_PI_INSTALL%"=="1" set "INSTALL_PI=0"
if "%INSTALL_PI%"=="1" (
  echo Installing Pi runtime: %PI_PACKAGE%
  npm install -g "%PI_PACKAGE%"
  if errorlevel 1 exit /b 1
) else (
  echo Pi runtime already found on PATH; leaving the existing global install untouched.
)

echo Creating directories...
if not exist "%PI_AGENT_DIR%\extensions" mkdir "%PI_AGENT_DIR%\extensions"
if not exist "%PI_AGENT_DIR%\memory" mkdir "%PI_AGENT_DIR%\memory"
if not exist "%PI_AGENT_DIR%\memories" mkdir "%PI_AGENT_DIR%\memories"
if not exist "%PI_AGENT_DIR%\sessions" mkdir "%PI_AGENT_DIR%\sessions"
if not exist "%PI_WORKSPACE_DIR%\persona" mkdir "%PI_WORKSPACE_DIR%\persona"
if not exist "%PI_WORKSPACE_DIR%\rooms" mkdir "%PI_WORKSPACE_DIR%\rooms"
if not exist "%AGENTS_SKILLS_DIR%" mkdir "%AGENTS_SKILLS_DIR%"
if not exist "%PI_APP_DIR%" mkdir "%PI_APP_DIR%"
if not exist "%PI_BIN_DIR%" mkdir "%PI_BIN_DIR%"

echo Copying harness files...

if exist "%HARNESS_DIR%\AGENTS.md" (
  if exist "%PI_AGENT_DIR%\AGENTS.md" copy /Y "%PI_AGENT_DIR%\AGENTS.md" "%PI_AGENT_DIR%\AGENTS.md.bak.%RANDOM%" >nul
  copy /Y "%HARNESS_DIR%\AGENTS.md" "%PI_AGENT_DIR%\AGENTS.md" >nul
)

for %%F in (SOUL.md CONSTITUTION.md FOUNDATION.md HEARTBEAT.md MEMORY.md TOOLS.md ROOMS.md TRANSFER.md) do (
  if exist "%HARNESS_DIR%\%%F" copy /Y "%HARNESS_DIR%\%%F" "%PI_AGENT_DIR%\%%F" >nul
)

if exist "%HARNESS_DIR%\settings.json" (
  if not exist "%PI_AGENT_DIR%\settings.json" copy /Y "%HARNESS_DIR%\settings.json" "%PI_AGENT_DIR%\settings.json" >nul
)

if exist "%HARNESS_DIR%\heartbeat.json" (
  if not exist "%PI_AGENT_DIR%\heartbeat.json" copy /Y "%HARNESS_DIR%\heartbeat.json" "%PI_AGENT_DIR%\heartbeat.json" >nul
)

if not exist "%PI_AGENT_DIR%\auth.json" echo {}>"%PI_AGENT_DIR%\auth.json"

if exist "%HARNESS_DIR%\boot" xcopy "%HARNESS_DIR%\boot" "%PI_AGENT_DIR%\boot\" /E /I /Y >nul
if exist "%HARNESS_DIR%\extensions" xcopy "%HARNESS_DIR%\extensions" "%PI_AGENT_DIR%\extensions\" /E /I /Y >nul
if exist "%HARNESS_DIR%\memory" xcopy "%HARNESS_DIR%\memory" "%PI_AGENT_DIR%\memory\" /E /I /Y >nul
if exist "%HARNESS_DIR%\persona" xcopy "%HARNESS_DIR%\persona" "%PI_WORKSPACE_DIR%\persona\" /E /I /Y >nul
if exist "%HARNESS_DIR%\rooms" xcopy "%HARNESS_DIR%\rooms" "%PI_WORKSPACE_DIR%\rooms\" /E /I /Y >nul
if exist "%HARNESS_DIR%\skills" xcopy "%HARNESS_DIR%\skills" "%AGENTS_SKILLS_DIR%\" /E /I /Y >nul

if exist "%HARNESS_DIR%\os-skill" (
  if not exist "%AGENTS_SKILLS_DIR%\resonant-os" mkdir "%AGENTS_SKILLS_DIR%\resonant-os"
  xcopy "%HARNESS_DIR%\os-skill" "%AGENTS_SKILLS_DIR%\resonant-os\" /E /I /Y >nul
)

echo Copying RESONANT Agent launchers...
if exist "%SCRIPT_DIR%bridge" xcopy "%SCRIPT_DIR%bridge" "%PI_APP_DIR%\bridge\" /E /I /Y >nul
if exist "%SCRIPT_DIR%scripts" xcopy "%SCRIPT_DIR%scripts" "%PI_APP_DIR%\scripts\" /E /I /Y >nul
if exist "%SCRIPT_DIR%ui" xcopy "%SCRIPT_DIR%ui" "%PI_APP_DIR%\ui\" /E /I /Y >nul
if exist "%SCRIPT_DIR%heartbeat" xcopy "%SCRIPT_DIR%heartbeat" "%PI_APP_DIR%\heartbeat\" /E /I /Y >nul
if exist "%SCRIPT_DIR%telegram" xcopy "%SCRIPT_DIR%telegram" "%PI_APP_DIR%\telegram\" /E /I /Y >nul
for %%F in (install.bat install.ps1 configure.bat configure.ps1 start.bat start.ps1 ui.bat heartbeat-start.bat heartbeat-start.ps1 telegram-setup.bat telegram-start.bat package.json README.md RELEASE.md) do (
  if exist "%SCRIPT_DIR%%%F" copy /Y "%SCRIPT_DIR%%%F" "%PI_APP_DIR%\%%F" >nul
)
(
  echo @echo off
  echo set "RESONANT_HOME=%PI_HOME%"
  echo set "PI_HOME=%PI_HOME%"
  echo set "PI_CODING_AGENT_DIR=%PI_AGENT_DIR%"
  echo call "%PI_APP_DIR%\start.bat" %%*
) > "%PI_BIN_DIR%\resonant.bat"

(
  echo @echo off
  echo set "RESONANT_HOME=%PI_HOME%"
  echo set "PI_HOME=%PI_HOME%"
  echo set "PI_CODING_AGENT_DIR=%PI_AGENT_DIR%"
  echo call "%PI_APP_DIR%\heartbeat-start.bat" %%*
) > "%PI_BIN_DIR%\resonant-heartbeat.bat"

echo Checking pi command...
where pi >nul 2>nul
if errorlevel 1 (
  echo pi command was not found on PATH after install.
  echo Restart your terminal or add npm's global bin directory to PATH.
) else (
  pi --help >nul 2>nul
  if errorlevel 1 (
    echo pi command exists, but --help returned a non-zero status. You may still be able to run pi interactively.
  ) else (
    echo pi command is available.
  )
)

echo.
echo Health check:
set /a HEALTH_TOTAL=0
set /a HEALTH_PRESENT=0
call :CheckFile "%PI_AGENT_DIR%\AGENTS.md" "~/.resonant/agent/AGENTS.md"
call :CheckFile "%PI_AGENT_DIR%\SOUL.md" "~/.resonant/agent/SOUL.md"
call :CheckFile "%PI_AGENT_DIR%\CONSTITUTION.md" "~/.resonant/agent/CONSTITUTION.md"
call :CheckFile "%PI_AGENT_DIR%\FOUNDATION.md" "~/.resonant/agent/FOUNDATION.md"
call :CheckFile "%PI_AGENT_DIR%\HEARTBEAT.md" "~/.resonant/agent/HEARTBEAT.md"
call :CheckFile "%PI_AGENT_DIR%\heartbeat.json" "~/.resonant/agent/heartbeat.json"
call :CheckFile "%PI_AGENT_DIR%\MEMORY.md" "~/.resonant/agent/MEMORY.md"
call :CheckFile "%PI_AGENT_DIR%\TOOLS.md" "~/.resonant/agent/TOOLS.md"
call :CheckFile "%PI_AGENT_DIR%\ROOMS.md" "~/.resonant/agent/ROOMS.md"
call :CheckFile "%PI_AGENT_DIR%\boot\BOOT.md" "~/.resonant/agent/boot/BOOT.md"
call :CheckFile "%PI_WORKSPACE_DIR%\persona\IDENTITY.md" "~/.resonant/workspace/persona/IDENTITY.md"
call :CheckFile "%PI_WORKSPACE_DIR%\persona\USER.md" "~/.resonant/workspace/persona/USER.md"
call :CheckNonEmptyDir "%PI_WORKSPACE_DIR%\rooms" "~/.resonant/workspace/rooms/"

if "!HEALTH_PRESENT!"=="!HEALTH_TOTAL!" (
  echo Health check: !HEALTH_PRESENT!/!HEALTH_TOTAL! files present. Ready to configure.
) else (
  echo Health check: !HEALTH_PRESENT!/!HEALTH_TOTAL! files present. Issues found — check above.
)

echo.
echo RESONANT Agent installed.
echo Next steps:
echo   1. Run %PI_APP_DIR%\configure.bat
echo   2. Start RESONANT Agent with: %PI_APP_DIR%\start.bat
echo   3. Optional launcher: %PI_BIN_DIR%\resonant.bat
echo   4. Optional heartbeats: %PI_APP_DIR%\heartbeat-start.bat
echo   5. Edit %PI_AGENT_DIR%\AGENTS.md to customize the resonant identity.

endlocal
exit /b 0

:CheckFile
set /a HEALTH_TOTAL+=1
if exist "%~1" (
  set /a HEALTH_PRESENT+=1
  echo ✅ %~2
) else (
  echo ❌ %~2
  echo WARNING: %~2 is missing. The agent may not boot correctly.
)
exit /b 0

:CheckNonEmptyDir
set /a HEALTH_TOTAL+=1
if not exist "%~1\" (
  echo ❌ %~2
  echo WARNING: %~2 is missing. The agent may not boot correctly.
  exit /b 0
)
dir /b "%~1" 2>nul | findstr /r "." >nul
if errorlevel 1 (
  echo ❌ %~2
  echo WARNING: %~2 is missing. The agent may not boot correctly.
) else (
  set /a HEALTH_PRESENT+=1
  echo ✅ %~2
)
exit /b 0
