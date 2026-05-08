#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_HOME="${RESONANT_HOME:-$HOME/.resonant}"
export PI_CODING_AGENT_DIR="$PI_HOME/agent"

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js is required to run the RESONANT Agent local UI.\n' >&2
  exit 1
fi

node "$SCRIPT_DIR/ui/server.js"
