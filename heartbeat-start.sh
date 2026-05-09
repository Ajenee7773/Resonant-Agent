#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_HOME="${RESONANT_HOME:-$HOME/.resonant}"
export RESONANT_HOME="$PI_HOME"
export PI_HOME="$PI_HOME"
export PI_CODING_AGENT_DIR="$PI_HOME/agent"

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js is required to run RESONANT heartbeats.\n' >&2
  exit 1
fi

node "$SCRIPT_DIR/heartbeat/runner.js" "$@"
