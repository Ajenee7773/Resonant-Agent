$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& node "$ScriptDir\speak.js" @args
exit $LASTEXITCODE
