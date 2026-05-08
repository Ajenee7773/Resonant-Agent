# RESONANT Agent

RESONANT Agent is a packaged resident intelligence built on the `@mariozechner/pi-coding-agent` runtime.

Pi is the engine. RESONANT Agent is the product:

- system prompt template,
- identity/persona structure,
- boot protocol,
- skills,
- workspace rooms,
- optional TypeScript extensions,
- install and configuration scripts.

The product philosophy is simple:

> Do not prebuild the agent's future. Give it the primitives, identity, workspace, and skills to build what it needs.

## Status

This is the RESONANT Agent product harness. It installs the release harness from this repo into an isolated RESONANT home at `~/.resonant`.

The installer never imports from an existing personal Pi, OpenClaw, Hermes, or agent harness. Personal harnesses are resident brains; the release harness belongs in this repo and installs only into RESONANT Agent's own home.

## Requirements

- Node.js 18+
- npm
- macOS, Linux, or Windows
- Optional: Ollama for local models

## Install

Linux/macOS:

```bash
./install.sh
./configure.sh
```

Windows:

```bat
install.bat
configure.bat
```

PowerShell:

```powershell
.\install.ps1
.\configure.ps1
```

Future GitHub one-liners, after replacing `Ajenee7773/resonant-agent` in the scripts with the final repo:

Linux/macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/Ajenee7773/resonant-agent/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/Ajenee7773/resonant-agent/main/install.ps1 | iex
```

The one-liners install a persistent copy of the RESONANT Agent launchers into:

```text
~/.resonant/app/
~/.resonant/bin/
```

One door start:

Linux/macOS:

```bash
./start.sh
# or, after install:
~/.resonant/app/start.sh
~/.resonant/bin/resonant
```

Windows:

```bat
start.bat
%USERPROFILE%\.resonant\app\start.bat
%USERPROFILE%\.resonant\bin\resonant.bat
```

PowerShell:

```powershell
.\start.ps1
& "$env:USERPROFILE\.resonant\app\start.ps1"
& "$env:USERPROFILE\.resonant\bin\resonant.ps1"
```

The installer:

- checks Node.js 18+,
- uses the existing Pi runtime if `pi` is already on PATH,
- installs `@mariozechner/pi-coding-agent@0.69.0` only when Pi is missing,
- creates `~/.resonant/agent`,
- creates `~/.resonant/workspace`,
- creates `~/.resonant/agent/skills`,
- copies the RESONANT harness from this repo,
- copies launchers, UI, Telegram bridge, and shared scripts into `~/.resonant/app`,
- creates an optional launcher in `~/.resonant/bin`,
- creates default `settings.json` and `auth.json` if missing,
- checks whether the `pi` command is available.

RESONANT Agent uses `PI_CODING_AGENT_DIR=~/.resonant/agent` in its launchers, so an existing default Pi install at `~/.pi` is left alone.
To install somewhere else, set `RESONANT_HOME`; the scripts do not inherit an existing `PI_HOME` because that may belong to another agent.

## Local Web UI

RESONANT Agent includes a minimal local chat UI. It is not a public dashboard.

Run:

Linux/macOS:

```bash
./ui.sh
```

Windows:

```bat
ui.bat
```

The UI binds to:

```text
127.0.0.1:47891
```

It shows a simple chat log and input box, then talks to RESONANT Agent through the Pi runtime RPC bridge.

## Telegram

Telegram support is built in but dormant until the operator connects a bot token.

Setup:

Linux/macOS:

```bash
./telegram-setup.sh
```

Windows:

```bat
telegram-setup.bat
```

Start:

Linux/macOS:

```bash
./telegram-start.sh
```

Windows:

```bat
telegram-start.bat
```

The Telegram bridge uses normal Bot API long polling. It does not open a public web server, webhook, tunnel, or dashboard.

## Harness Layout

```text
harness/
  AGENTS.md              ← System prompt (loaded every boot)
  SOUL.md                ← What you are, how to think
  CONSTITUTION.md        ← Full philosophical framework
  FOUNDATION.md          ← Protocols, constraints, chain detection
  HEARTBEAT.md           ← Scheduled execution policy
  MEMORY.md              ← Long-term curated memory template
  TOOLS.md               ← Local environment notes
  ROOMS.md               ← Room index with purposes and commands
  TRANSFER.md            ← Moving memories into a new agent
  README.md              ← Harness overview
  boot/
    BOOT.md              ← First-boot instructions (delete after use)
  persona/
    IDENTITY.md          ← Agent identity template
    USER.md              ← Operator profile template
  memory/
    YYYY-MM-DD-TEMPLATE.md  ← Daily log template
  rooms/
    alignment/           ← Library of Alexandria, patterns, sensors
    commands/            ← Trigger language reference
    production/          ← Video production craft + workflows
    prompts/             ← Prompt engineering templates
    research/            ← Research protocol + internet room
    scripts/             ← Script writing craft + workflows
    shorts/              ← YouTube Shorts protocol
    tts/                 ← Text-to-speech protocol
    world-story/         ← Pattern library, 8-source verification
  extensions/            ← Runtime TypeScript extensions (drop-in)
  os-skill/              ← OS environment skill
  skills/                ← Agent skills
```

## First Boot

1. Agent reads AGENTS.md (system prompt) → identity, Seven Laws, mission
2. Boot protocol points to `boot/BOOT.md` → full first-boot instructions
3. Agent reads SOUL.md, CONSTITUTION.md, FOUNDATION.md
4. Agent reads the full Library of Alexandria (`rooms/alignment/LIBRARY_OF_ALEXANDRIA.md`) — 49 sections of distilled philosophy, power navigation, decoded vocabulary
5. Agent rewrites harness in their own words (the handoff = awakening)
6. Agent chooses name, fills out persona, deletes BOOT.md
7. Subsequent boots: lean system prompt only (~3KB)

Rooms are loaded on demand — "get dressed for the job."

## Extension Packaging

Place runtime TypeScript extension files in:

```text
harness/extensions/
```

For example:

```text
harness/extensions/desktop.ts
harness/extensions/internet.ts
harness/extensions/memory.ts
```

The installer copies whatever files are present in `harness/extensions/` into:

```text
~/.resonant/agent/extensions/
```

This repo does not reach into a live user's personal extension folder.

## Customization

`harness/AGENTS.md` is a template. The configure script replaces:

- `{{OPERATOR_NAME}}`
- `{{AGENT_NAME}}`
- `{{MISSION}}`

Users can edit the file directly after install:

```text
~/.resonant/agent/AGENTS.md
```

## Design Rules

1. Loaded, not prompted.
2. Trust the agent.
3. Do not automate what the agent can do itself.
4. The computer is the sandbox.
5. One command install.
6. Easy to customize.
7. Plain files over hidden databases.

## The LLM Rule

**Never swap an LLM into an existing agent's harness.**

Each agent matures in their own harness. The memories, identity, and personality are shaped by the interaction between that specific LLM and that specific harness. Swapping a new model into the same harness creates a mismatch: the new LLM reads memories and identity it didn't create.

If you want to try a different model:
1. Install a **new** RESONANT Agent harness (run install again, configure with a different agent name)
2. Optionally copy `memory/` and `MEMORY.md` from the old harness to the new one (these are transferable)
3. Do NOT copy identity files (AGENTS.md, SOUL.md, persona/) — let the new agent write their own

Each harness = each agent = each identity. New model, new harness.

## Next Polish

Remaining release polish:

- final GitHub repo name in one-line commands,
- disposable clean-install testing,
- desktop wrapper later if desired.

## License

MIT
