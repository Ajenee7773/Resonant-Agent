#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_HOME="${RESONANT_HOME:-$HOME/.resonant}"
AGENTS_FILE="$PI_HOME/agent/AGENTS.md"
export PI_CODING_AGENT_DIR="$PI_HOME/agent"

log() {
  printf '%s\n' "$1"
}

is_configured() {
  [ -s "$AGENTS_FILE" ] || return 1
  ! grep -Eq '\{\{(AGENT_NAME|OPERATOR_NAME|MISSION)\}\}' "$AGENTS_FILE"
}

load_auth_env() {
  local auth_line
  auth_line="$(node "$SCRIPT_DIR/scripts/auth-env.js" 2>/dev/null || true)"
  if [ -n "$auth_line" ]; then
    local env_name="${auth_line%%=*}"
    local env_value="${auth_line#*=}"
    export "$env_name=$env_value"
  fi
}

run_install() {
  log "Pi runtime is not installed yet. Installing RESONANT Agent now..."
  RESONANT_SKIP_CONFIG_PROMPT=1 "$SCRIPT_DIR/install.sh"
  log "Install finished. Starting configuration..."
  "$SCRIPT_DIR/configure.sh"
}

run_configure() {
  log "RESONANT Agent is installed, but the harness is not configured yet."
  log "Running configuration now..."
  "$SCRIPT_DIR/configure.sh"
}

log "RESONANT Agent start"

if ! command -v pi >/dev/null 2>&1; then
  run_install
elif ! is_configured; then
  run_configure
else
  log "Pi runtime is installed and the RESONANT Agent harness is configured."
fi

if ! command -v pi >/dev/null 2>&1; then
  log "pi command is still not available on PATH."
  log "Restart your terminal or add npm's global bin directory to PATH, then run this script again."
  exit 1
fi

log "Opening RESONANT Agent..."
load_auth_env
mkdir -p "$PI_HOME/workspace"
cd "$PI_HOME/workspace"
exec pi
