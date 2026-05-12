#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_HOME="${RESONANT_HOME:-$HOME/.resonant}"
PI_AGENT_DIR="$PI_HOME/agent"
AGENTS_FILE="$PI_AGENT_DIR/AGENTS.md"
AUTH_FILE="$PI_AGENT_DIR/auth.json"
MODELS_FILE="$PI_AGENT_DIR/models.json"
SETTINGS_FILE="$PI_AGENT_DIR/settings.json"
export PI_CODING_AGENT_DIR="$PI_AGENT_DIR"

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

prompt_default() {
  label="$1"
  default="$2"
  printf '%s [%s]: ' "$label" "$default" >&2
  read -r value
  if [ -z "$value" ]; then
    printf '%s' "$default"
  else
    printf '%s' "$value"
  fi
}

prompt_number_default() {
  label="$1"
  default="$2"
  while true; do
    value="$(prompt_default "$label" "$default")"
    clean="$(printf '%s' "$value" | tr -d ',' | tr -d '[:space:]')"
    case "$clean" in
      ''|*[!0-9]*)
        printf 'Enter a positive whole number, for example 1000000.\n' >&2
        ;;
      *)
        if [ "$clean" -gt 0 ] 2>/dev/null; then
          printf '%s' "$clean"
          return
        fi
        printf 'Enter a positive whole number, for example 1000000.\n' >&2
        ;;
    esac
  done
}

[ -d "$PI_AGENT_DIR" ] || die "$PI_AGENT_DIR does not exist. Run install.sh first."
[ -f "$AGENTS_FILE" ] || die "$AGENTS_FILE does not exist. Run install.sh first."
command -v node >/dev/null 2>&1 || die "Node.js is required for configuration."

printf 'RESONANT Agent configuration\n'
printf 'Model mode:\n'
printf '  1. Ollama local\n'
printf '  2. Cloud provider\n'
printf 'Choose 1 or 2 [1]: '
read -r model_choice
model_choice="${model_choice:-1}"

provider=""
model=""
api_key=""

if [ "$model_choice" = "1" ]; then
  provider="ollama"
  model="$(prompt_default "Ollama model" "llama3.1:8b")"
  if ! command -v ollama >/dev/null 2>&1; then
    printf 'Ollama is not installed. Download it from https://ollama.com/download\n'
    os_name="$(uname -s 2>/dev/null || printf 'unknown')"
    if [ "$os_name" = "Darwin" ]; then
      printf 'Open the download page now? [Y/n]: '
      read -r open_ollama
      open_ollama="${open_ollama:-Y}"
      if [ "$open_ollama" != "n" ] && [ "$open_ollama" != "N" ]; then
        open "https://ollama.com/download" >/dev/null 2>&1 || true
      fi
    elif [ "$os_name" = "Linux" ]; then
      printf 'Linux install option: curl -fsSL https://ollama.com/install.sh | sh\n'
    else
      printf 'Open https://ollama.com/download in your browser to install Ollama.\n'
    fi
    exit 1
  fi

  if ! ollama list >/dev/null 2>&1; then
    printf 'Ollama is installed but not running. Start it first, then re-run configure.\n'
    exit 1
  fi

  printf 'Pulling Ollama model %s...\n' "$model"
  ollama pull "$model"
else
  provider="$(prompt_default "Cloud provider id" "openai")"
  model="$(prompt_default "Model name" "gpt-4.1-mini")"
  printf 'API key: '
  stty -echo 2>/dev/null || true
  read -r api_key
  stty echo 2>/dev/null || true
  printf '\n'
fi

context_window="$(prompt_number_default "Context window tokens" "1000000")"
max_tokens="$(prompt_number_default "Max output tokens" "16384")"
operator_name="$(prompt_default "Operator name" "Operator")"
agent_name="$(prompt_default "Agent name" "Resonant")"
mission="$(prompt_default "Mission" "Help the operator think, build, create, and act with clarity.")"

export RESONANT_PROVIDER="$provider"
export RESONANT_MODEL="$model"
export RESONANT_API_KEY="$api_key"
export RESONANT_CONTEXT_WINDOW="$context_window"
export RESONANT_MAX_TOKENS="$max_tokens"
export RESONANT_OPERATOR_NAME="$operator_name"
export RESONANT_AGENT_NAME="$agent_name"
export RESONANT_MISSION="$mission"
export AGENTS_FILE AUTH_FILE MODELS_FILE SETTINGS_FILE

node "$SCRIPT_DIR/scripts/write-config.js"

chmod 600 "$AUTH_FILE" 2>/dev/null || true

printf '\nConfiguration complete.\n'
printf 'Agent file: %s\n' "$AGENTS_FILE"
printf 'Auth file: %s\n' "$AUTH_FILE"
printf 'Start with: ./start.sh\n'

printf '\nConnect Telegram now? [y/N]: '
read -r telegram_choice
telegram_choice="${telegram_choice:-N}"
if [ "$telegram_choice" = "y" ] || [ "$telegram_choice" = "Y" ]; then
  if [ -f "$SCRIPT_DIR/telegram/setup.js" ]; then
    node "$SCRIPT_DIR/telegram/setup.js"
  else
    printf 'Telegram setup is not packaged in this build.\n'
  fi
fi
