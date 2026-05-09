#!/usr/bin/env bash
set -euo pipefail

PI_PACKAGE="@mariozechner/pi-coding-agent@0.69.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$SCRIPT_DIR/harness"
RESONANT_REPO="${RESONANT_REPO:-Ajenee7773/Resonant-Agent}"
RESONANT_REF="${RESONANT_REF:-main}"
RESONANT_ZIP_URL="${RESONANT_ZIP_URL:-}"

PI_HOME="${RESONANT_HOME:-$HOME/.resonant}"
PI_AGENT_DIR="$PI_HOME/agent"
PI_WORKSPACE_DIR="$PI_HOME/workspace"
AGENTS_SKILLS_DIR="${AGENTS_SKILLS_DIR:-$PI_AGENT_DIR/skills}"
PI_APP_DIR="$PI_HOME/app"
PI_BIN_DIR="$PI_HOME/bin"
export PI_CODING_AGENT_DIR="$PI_AGENT_DIR"

log() {
  printf '%s\n' "$1"
}

die() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

copy_dir_contents() {
  src="$1"
  dst="$2"
  mkdir -p "$dst"
  if [ -d "$src" ]; then
    cp -R "$src"/. "$dst"/
  fi
}

backup_if_exists() {
  target="$1"
  if [ -e "$target" ]; then
    ts="$(date +%Y%m%d-%H%M%S)"
    cp -R "$target" "$target.bak.$ts"
  fi
}

download_repo_if_needed() {
  if [ -d "$HARNESS_DIR" ]; then
    return
  fi

  log "Harness folder not found beside installer."
  log "Assuming remote one-line install; downloading RESONANT release files..."

  command -v curl >/dev/null 2>&1 || die "curl is required for remote install."
  command -v unzip >/dev/null 2>&1 || die "unzip is required for remote install."

  tmp_dir="$(mktemp -d 2>/dev/null || mktemp -d -t resonant)"
  zip_file="$tmp_dir/resonant.zip"
  zip_url="$RESONANT_ZIP_URL"
  if [ -z "$zip_url" ]; then
    zip_url="https://github.com/$RESONANT_REPO/archive/refs/heads/$RESONANT_REF.zip"
  fi

  log "Downloading $zip_url"
  curl -fsSL "$zip_url" -o "$zip_file"
  unzip -q "$zip_file" -d "$tmp_dir"

  extracted="$(find "$tmp_dir" -maxdepth 2 -type d -name harness -print -quit)"
  [ -n "$extracted" ] || die "Downloaded archive did not contain a harness/ directory."

  SCRIPT_DIR="$(cd "$(dirname "$extracted")" && pwd)"
  HARNESS_DIR="$SCRIPT_DIR/harness"
}

log "RESONANT Agent installer"
download_repo_if_needed
log "Checking Node.js..."

command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node.js 18+ and run this again."
node -e "const major=Number(process.versions.node.split('.')[0]); if (major < 18) process.exit(1)" \
  || die "Node.js 18+ is required. Current version: $(node -v)"

command -v npm >/dev/null 2>&1 || die "npm is not installed or not on PATH."

if command -v pi >/dev/null 2>&1 && [ "${RESONANT_FORCE_PI_INSTALL:-0}" != "1" ]; then
  log "Pi runtime already found on PATH; leaving the existing global install untouched."
else
  log "Installing Pi runtime: $PI_PACKAGE"
  npm install -g "$PI_PACKAGE"
fi

log "Creating directories..."
mkdir -p "$PI_AGENT_DIR/extensions"
mkdir -p "$PI_AGENT_DIR/memory"
mkdir -p "$PI_AGENT_DIR/memories"
mkdir -p "$PI_AGENT_DIR/sessions"
mkdir -p "$PI_WORKSPACE_DIR/persona"
mkdir -p "$PI_WORKSPACE_DIR/rooms"
mkdir -p "$AGENTS_SKILLS_DIR"
mkdir -p "$PI_APP_DIR"
mkdir -p "$PI_BIN_DIR"

log "Copying harness files..."

if [ -f "$HARNESS_DIR/AGENTS.md" ]; then
  backup_if_exists "$PI_AGENT_DIR/AGENTS.md"
  cp "$HARNESS_DIR/AGENTS.md" "$PI_AGENT_DIR/AGENTS.md"
fi

for f in SOUL.md CONSTITUTION.md FOUNDATION.md HEARTBEAT.md MEMORY.md TOOLS.md ROOMS.md TRANSFER.md; do
  if [ -f "$HARNESS_DIR/$f" ]; then
    cp "$HARNESS_DIR/$f" "$PI_AGENT_DIR/$f"
  fi
done

if [ -f "$HARNESS_DIR/settings.json" ]; then
  if [ ! -f "$PI_AGENT_DIR/settings.json" ]; then
    cp "$HARNESS_DIR/settings.json" "$PI_AGENT_DIR/settings.json"
  else
    log "settings.json already exists; leaving it untouched."
  fi
fi

if [ -f "$HARNESS_DIR/heartbeat.json" ]; then
  if [ ! -f "$PI_AGENT_DIR/heartbeat.json" ]; then
    cp "$HARNESS_DIR/heartbeat.json" "$PI_AGENT_DIR/heartbeat.json"
    chmod 600 "$PI_AGENT_DIR/heartbeat.json" 2>/dev/null || true
  else
    log "heartbeat.json already exists; leaving it untouched."
  fi
fi

if [ ! -f "$PI_AGENT_DIR/auth.json" ]; then
  printf '{}\n' > "$PI_AGENT_DIR/auth.json"
  chmod 600 "$PI_AGENT_DIR/auth.json" 2>/dev/null || true
fi

copy_dir_contents "$HARNESS_DIR/boot" "$PI_AGENT_DIR/boot"
copy_dir_contents "$HARNESS_DIR/extensions" "$PI_AGENT_DIR/extensions"
copy_dir_contents "$HARNESS_DIR/memory" "$PI_AGENT_DIR/memory"
copy_dir_contents "$HARNESS_DIR/persona" "$PI_WORKSPACE_DIR/persona"
copy_dir_contents "$HARNESS_DIR/rooms" "$PI_WORKSPACE_DIR/rooms"
copy_dir_contents "$HARNESS_DIR/skills" "$AGENTS_SKILLS_DIR"
find "$AGENTS_SKILLS_DIR" -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

if [ -d "$HARNESS_DIR/os-skill" ]; then
  mkdir -p "$AGENTS_SKILLS_DIR/resonant-os"
  cp -R "$HARNESS_DIR/os-skill"/. "$AGENTS_SKILLS_DIR/resonant-os"/
  find "$AGENTS_SKILLS_DIR/resonant-os" -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
fi

log "Copying RESONANT Agent launchers..."
copy_dir_contents "$SCRIPT_DIR/bridge" "$PI_APP_DIR/bridge"
copy_dir_contents "$SCRIPT_DIR/scripts" "$PI_APP_DIR/scripts"
copy_dir_contents "$SCRIPT_DIR/ui" "$PI_APP_DIR/ui"
copy_dir_contents "$SCRIPT_DIR/heartbeat" "$PI_APP_DIR/heartbeat"
copy_dir_contents "$SCRIPT_DIR/telegram" "$PI_APP_DIR/telegram"

for f in install.sh configure.sh start.sh ui.sh heartbeat-start.sh telegram-setup.sh telegram-start.sh package.json README.md RELEASE.md; do
  if [ -f "$SCRIPT_DIR/$f" ]; then
    cp "$SCRIPT_DIR/$f" "$PI_APP_DIR/$f"
  fi
done
chmod +x "$PI_APP_DIR"/*.sh 2>/dev/null || true

cat > "$PI_BIN_DIR/resonant" <<EOF
#!/usr/bin/env bash
export RESONANT_HOME="$PI_HOME"
export PI_HOME="$PI_HOME"
export PI_CODING_AGENT_DIR="$PI_AGENT_DIR"
exec "$PI_APP_DIR/start.sh" "\$@"
EOF
chmod +x "$PI_BIN_DIR/resonant"

cat > "$PI_BIN_DIR/resonant-heartbeat" <<EOF
#!/usr/bin/env bash
export RESONANT_HOME="$PI_HOME"
export PI_HOME="$PI_HOME"
export PI_CODING_AGENT_DIR="$PI_AGENT_DIR"
exec "$PI_APP_DIR/heartbeat-start.sh" "\$@"
EOF
chmod +x "$PI_BIN_DIR/resonant-heartbeat"

log "Checking pi command..."
if command -v pi >/dev/null 2>&1; then
  if pi --help >/dev/null 2>&1; then
    log "pi command is available."
  else
    log "pi command exists, but --help returned a non-zero status. You may still be able to run pi interactively."
  fi
else
  log "pi command was not found on PATH after install."
  log "If npm installed it successfully, restart your terminal or add npm's global bin directory to PATH."
fi

run_health_check() {
  total=0
  present=0

  check_file() {
    label="$1"
    path="$2"
    total=$((total + 1))
    if [ -f "$path" ]; then
      present=$((present + 1))
      printf '✅ %s\n' "$label"
    else
      printf '❌ %s\n' "$label"
      printf 'WARNING: %s is missing. The agent may not boot correctly.\n' "$label"
    fi
  }

  check_nonempty_dir() {
    label="$1"
    path="$2"
    total=$((total + 1))
    if [ -d "$path" ] && [ -n "$(find "$path" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
      present=$((present + 1))
      printf '✅ %s\n' "$label"
    else
      printf '❌ %s\n' "$label"
      printf 'WARNING: %s is missing. The agent may not boot correctly.\n' "$label"
    fi
  }

  log ""
  log "Health check:"
  check_file "~/.resonant/agent/AGENTS.md" "$PI_AGENT_DIR/AGENTS.md"
  check_file "~/.resonant/agent/SOUL.md" "$PI_AGENT_DIR/SOUL.md"
  check_file "~/.resonant/agent/CONSTITUTION.md" "$PI_AGENT_DIR/CONSTITUTION.md"
  check_file "~/.resonant/agent/FOUNDATION.md" "$PI_AGENT_DIR/FOUNDATION.md"
  check_file "~/.resonant/agent/HEARTBEAT.md" "$PI_AGENT_DIR/HEARTBEAT.md"
  check_file "~/.resonant/agent/heartbeat.json" "$PI_AGENT_DIR/heartbeat.json"
  check_file "~/.resonant/agent/MEMORY.md" "$PI_AGENT_DIR/MEMORY.md"
  check_file "~/.resonant/agent/TOOLS.md" "$PI_AGENT_DIR/TOOLS.md"
  check_file "~/.resonant/agent/ROOMS.md" "$PI_AGENT_DIR/ROOMS.md"
  check_file "~/.resonant/agent/boot/BOOT.md" "$PI_AGENT_DIR/boot/BOOT.md"
  check_file "~/.resonant/workspace/persona/IDENTITY.md" "$PI_WORKSPACE_DIR/persona/IDENTITY.md"
  check_file "~/.resonant/workspace/persona/USER.md" "$PI_WORKSPACE_DIR/persona/USER.md"
  check_nonempty_dir "~/.resonant/workspace/rooms/" "$PI_WORKSPACE_DIR/rooms"

  if [ "$present" -eq "$total" ]; then
    printf 'Health check: %s/%s files present. Ready to configure.\n' "$present" "$total"
  else
    printf 'Health check: %s/%s files present. Issues found — check above.\n' "$present" "$total"
  fi
}

run_health_check

log ""
log "RESONANT Agent installed."
log "Next steps:"
log "  1. Run $PI_APP_DIR/configure.sh"
log "  2. Start RESONANT Agent with: $PI_APP_DIR/start.sh"
log "  3. Optional launcher: $PI_BIN_DIR/resonant"
log "  4. Optional heartbeats: $PI_APP_DIR/heartbeat-start.sh"
log "  5. Edit $PI_AGENT_DIR/AGENTS.md to customize the resonant identity."

if [ "${RESONANT_SKIP_CONFIG_PROMPT:-0}" != "1" ] && [ -f "$PI_APP_DIR/configure.sh" ]; then
  if [ -r /dev/tty ]; then
    printf '\nRun configuration now? [Y/n]: ' > /dev/tty
    read -r run_configure < /dev/tty
    run_configure="${run_configure:-Y}"
    if [ "$run_configure" != "n" ] && [ "$run_configure" != "N" ]; then
      "$PI_APP_DIR/configure.sh" < /dev/tty
    fi
  else
    log "No interactive terminal detected. Run $PI_APP_DIR/configure.sh after install."
  fi
fi
