#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_HOME="${RESONANT_HOME:-$HOME/.resonant}"
export PI_CODING_AGENT_DIR="$PI_HOME/agent"

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js is required to run the RESONANT Agent local UI.\n' >&2
  exit 1
fi

if ! node "$SCRIPT_DIR/scripts/session-retention.js" --home "$PI_HOME" --max-age-days 15 >/dev/null; then
  printf 'Warning: old session cleanup could not finish. RESONANT Agent UI will still start.\n' >&2
fi

node "$SCRIPT_DIR/ui/server.js"
