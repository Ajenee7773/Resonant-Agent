# RESONANT Agent

**Website:** [aware-nirvana-rwmb.here.now](https://aware-nirvana-rwmb.here.now/)

## Start Here

**Give this page to your LLM or agent first.** Let it read these instructions and walk you through the install one step at a time.

Copy/paste this prompt into your LLM:

```text
I want to install RESONANT Agent from this GitHub repository. Read the README and walk me through it one command at a time. First ask me whether I am on macOS, Linux, or Windows. Make sure I have Node.js 18+ installed. Then give me the correct install command, help me answer the configuration questions, and help me launch the UI.
```

If you want to do it yourself, follow the steps below.

## Quick Install

Before installing, make sure you have:

- Node.js 18+
- npm
- Git
- Optional: Ollama, if you want to use Ollama models

### macOS

```bash
cd ~
git clone https://github.com/Ajenee7773/Resonant-Agent.git
cd Resonant-Agent
chmod +x install.sh configure.sh start.sh ui.sh heartbeat-start.sh telegram-setup.sh telegram-start.sh
./install.sh
./configure.sh
./start.sh
```

### Linux

```bash
cd ~
git clone https://github.com/Ajenee7773/Resonant-Agent.git
cd Resonant-Agent
chmod +x install.sh configure.sh start.sh ui.sh heartbeat-start.sh telegram-setup.sh telegram-start.sh
./install.sh
./configure.sh
./start.sh
```

### Windows PowerShell

```powershell
cd $env:USERPROFILE
git clone https://github.com/Ajenee7773/Resonant-Agent.git
cd Resonant-Agent
.\install.ps1
.\configure.ps1
.\start.ps1
```

PowerShell is recommended on Windows.

## Configuration Walkthrough

During configuration, RESONANT asks a few questions.

### Model Mode

```text
1. Ollama local
2. Cloud provider
```

Choose:

- `1` if you are using Ollama.
- `2` if you are using a hosted/cloud API provider such as OpenAI, OpenRouter, Groq, Anthropic, Google/Gemini, Mistral, xAI, or another provider with an API key.

### Ollama Model

If you choose Ollama, enter the model name, for example:

```text
llama3.1:8b
deepseek-r1:14b
qwen2.5-coder:32b
```

Ollama must be installed and running before configuration can finish.

### Cloud Provider

If you choose cloud provider, enter:

- provider id, for example `openai`, `openrouter`, `groq`, `anthropic`, `google`, `mistral`, or `xai`
- model name
- API key

### Context Window

Configuration also asks:

```text
Context window tokens [1000000]
Max output tokens [16384]
```

Enter the real limits for the model you are using. For 1M-token DeepSeek/Ollama-style models, use:

```text
1000000
```

Pi defaults unknown custom models to `128000` context tokens if this is not set, so RESONANT writes the value into `~/.resonant/agent/models.json` during configuration.

### Operator Name

This is your name. The agent uses it to know who it is working with.

### Agent Name

This is the name you want your RESONANT Agent to use.

### Mission

This is what you want the agent to help with. You can keep the default or write your own.

### Telegram

At the end, configuration asks:

```text
Connect Telegram now? [y/N]
```

Choose `N` if you want to skip Telegram for now. You can add it later.

If you choose `y`, you need a Telegram bot token first:

1. Open Telegram.
2. Search for `@BotFather` and make sure it is the official verified BotFather account.
3. Send `/newbot`.
4. Give the bot a display name, such as `My Resonant Agent`.
5. Give the bot a username. Telegram requires bot usernames to end in `bot`, such as `my_resonant_agent_bot`.
6. BotFather gives you a token. Treat it like a password.
7. Paste that token when RESONANT asks:

```text
Telegram bot token:
```

After that, RESONANT tells you to send `/start` to your new bot. This pairs your Telegram chat with your local RESONANT Agent.

## Launch RESONANT

Terminal mode:

macOS/Linux:

```bash
~/.resonant/bin/resonant
```

Windows PowerShell:

```powershell
& "$env:USERPROFILE\.resonant\bin\resonant.ps1"
```

## Launch The UI

RESONANT includes a simple local web UI.

macOS/Linux:

```bash
~/.resonant/app/ui.sh
```

Windows:

```bat
%USERPROFILE%\.resonant\app\ui.bat
```

Then open:

```text
http://127.0.0.1:47891
```

Say hi to your agent. On first boot, it reads the harness, absorbs the Library, rewrites its identity files, and comes online.

## Ask For Commands

RESONANT includes a command room with built-in workflows for memory, research, scripts, production, voice, Telegram, heartbeats, and more.

After your agent boots, ask:

```text
What commands do you know?
```

or:

```text
What's in your command room?
```

The agent will read:

```text
~/.resonant/workspace/rooms/commands/COMMANDS.md
```

and explain the available commands in plain language.

## Future Online Rooms

The local harness includes the core rooms needed to boot, remember, work, and stay coherent offline.

Future RESONANT rooms will also be hosted online as shared public rooms. That means the installed agent can stay lean while still being able to load expanded playbooks, research protocols, production rooms, platform guides, prompt libraries, and new skills from the RESONANT website when needed.

Local rooms are the agent's home. Online rooms are the shared library.

## What RESONANT Is

RESONANT Agent is a packaged resonant intelligence built on the `@mariozechner/pi-coding-agent` runtime.

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

The installer never imports from an existing personal Pi, OpenClaw, Hermes, or agent harness. Personal harnesses are resonant brains; the release harness belongs in this repo and installs only into RESONANT Agent's own home.

## Requirements

- Node.js 18+
- npm
- macOS, Linux, or Windows
- Optional: Ollama for local models

## Install From GitHub

While the repo is private, install with `git clone`. After the repo is public, use the one-line commands below.

### macOS

```bash
cd ~
git clone git@github.com:Ajenee7773/Resonant-Agent.git
cd Resonant-Agent
chmod +x install.sh configure.sh start.sh ui.sh heartbeat-start.sh telegram-setup.sh telegram-start.sh
./install.sh
./configure.sh
./start.sh
```

If SSH is not set up on the Mac, use HTTPS:

```bash
git clone https://github.com/Ajenee7773/Resonant-Agent.git
```

### Linux

```bash
cd ~
git clone https://github.com/Ajenee7773/Resonant-Agent.git
cd Resonant-Agent
chmod +x install.sh configure.sh start.sh ui.sh heartbeat-start.sh telegram-setup.sh telegram-start.sh
./install.sh
./configure.sh
./start.sh
```

### Windows PowerShell

```powershell
cd $env:USERPROFILE
git clone https://github.com/Ajenee7773/Resonant-Agent.git
cd Resonant-Agent
.\install.ps1
.\configure.ps1
.\start.ps1
```

If using SSH:

```powershell
git clone git@github.com:Ajenee7773/Resonant-Agent.git
```

### Windows Command Prompt

```bat
cd %USERPROFILE%
git clone https://github.com/Ajenee7773/Resonant-Agent.git
cd Resonant-Agent
install.bat
configure.bat
start.bat
```

PowerShell is recommended on Windows, but batch files are included.

### Public One-Line Install

Use these after the repo is public.

Linux/macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/Ajenee7773/Resonant-Agent/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/Ajenee7773/Resonant-Agent/main/install.ps1 | iex
```

The installers create a persistent copy of the RESONANT Agent launchers in:

```text
~/.resonant/app/
~/.resonant/bin/
```

## Start After Install

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

## Open The UI

RESONANT Agent includes a simple local chat UI. It runs on your own computer at `127.0.0.1`; it is not a public website.

macOS/Linux:

```bash
./ui.sh
# or, after install:
~/.resonant/app/ui.sh
```

Windows:

```bat
ui.bat
%USERPROFILE%\.resonant\app\ui.bat
```

The UI opens at:

```text
http://127.0.0.1:47891
```

If the browser does not open automatically, paste that address into your browser.

## Updating

macOS/Linux:

```bash
cd ~/Resonant-Agent
git pull
./install.sh
```

Windows PowerShell:

```powershell
cd "$env:USERPROFILE\Resonant-Agent"
git pull
.\install.ps1
```

The installer:

- checks Node.js 18+,
- uses the existing Pi runtime if `pi` is already on PATH,
- installs `@mariozechner/pi-coding-agent@0.69.0` only when Pi is missing,
- creates `~/.resonant/agent`,
- creates `~/.resonant/workspace`,
- creates `~/.resonant/agent/skills`,
- copies the RESONANT harness from this repo,
- copies launchers, UI, heartbeat runner, Telegram bridge, and shared scripts into `~/.resonant/app`,
- creates an optional launcher in `~/.resonant/bin`,
- creates default `settings.json`, `heartbeat.json`, and `auth.json` if missing,
- checks whether the `pi` command is available.

RESONANT Agent uses `PI_CODING_AGENT_DIR=~/.resonant/agent` in its launchers, so an existing default Pi install at `~/.pi` is left alone.
To install somewhere else, set `RESONANT_HOME`; the scripts do not inherit an existing `PI_HOME` because that may belong to another agent.

## Local Web UI

RESONANT Agent includes a minimal local chat UI. It is not a public dashboard.

Run:

Linux/macOS:

```bash
./ui.sh
# or, after install:
~/.resonant/app/ui.sh
```

Windows:

```bat
ui.bat
%USERPROFILE%\.resonant\app\ui.bat
```

The UI binds to:

```text
http://127.0.0.1:47891
```

It shows a simple chat log and input box, then talks to RESONANT Agent through the Pi runtime RPC bridge.

The UI also includes optional browser voice controls:

- **Mic** fills the input box when browser speech recognition is available.
- **Voice** reads assistant replies aloud using the browser's speech synthesis.

The sidebar also shows a compact heartbeat panel:

- status pulse for running, ready, paused, or stale heartbeat state
- current interval, delivery target, task count, and due count
- controls for Start, Pause/Resume, Run Once, and Dry Run

## Voice

RESONANT Agent includes a lightweight native voice skill. It is off by default and activates when the operator asks for voice.

Text-to-speech uses the computer's built-in speech tools:

- macOS: `say`
- Windows: SAPI built-in voices
- Linux: `spd-say` or `espeak`

Run it directly after install:

macOS/Linux:

```bash
~/.resonant/agent/skills/voice/scripts/speak.sh "RESONANT Agent voice online."
```

Windows PowerShell:

```powershell
& "$env:USERPROFILE\.resonant\agent\skills\voice\scripts\speak.ps1" "RESONANT Agent voice online."
```

Speech-to-text starts with the lowest-friction option: built-in OS dictation.

- macOS: Dictation
- Windows: `Win + H`

Operators can also speak into ChatGPT, Grok, Gemini, or another voice interface and paste the transcript into RESONANT. Whisper-based local transcription can be added later as an optional power-user path.

## Telegram

Telegram support is built in but dormant until the operator connects a bot token.

To get a bot token:

1. Open Telegram.
2. Search for `@BotFather`.
3. Start a chat with the official verified BotFather account.
4. Send `/newbot`.
5. Choose a display name.
6. Choose a username ending in `bot`, for example `my_resonant_agent_bot`.
7. Copy the token BotFather gives you.

Keep the token private. Anyone with the token can control that Telegram bot.

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

## Heartbeats

Heartbeats turn RESONANT into a resonant agent that can wake on a schedule.

They do not require a gateway, public server, webhook, or dashboard. The heartbeat runner is a small local Node process that calls the Pi runtime through the same RPC bridge used by the UI and Telegram.

Heartbeats run while the heartbeat process is open. The runner uses a lock file so only one continuous heartbeat loop runs for the agent at a time.

Start heartbeats:

Linux/macOS:

```bash
./heartbeat-start.sh
# or, after install:
~/.resonant/app/heartbeat-start.sh
~/.resonant/bin/resonant-heartbeat
```

Windows:

```bat
heartbeat-start.bat
%USERPROFILE%\.resonant\app\heartbeat-start.bat
%USERPROFILE%\.resonant\bin\resonant-heartbeat.bat
```

PowerShell:

```powershell
.\heartbeat-start.ps1
& "$env:USERPROFILE\.resonant\app\heartbeat-start.ps1"
& "$env:USERPROFILE\.resonant\bin\resonant-heartbeat.ps1"
```

Run one heartbeat immediately:

```bash
./heartbeat-start.sh --once
```

Dry-run the heartbeat plan without calling the model:

```bash
./heartbeat-start.sh --dry-run
```

The agent controls its heartbeat through:

```text
~/.resonant/agent/HEARTBEAT.md
~/.resonant/agent/heartbeat.json
```

`HEARTBEAT.md` describes the work. `heartbeat.json` controls the timing and delivery target.

Supported targets:

- `console` — print meaningful heartbeat replies in the terminal running the heartbeat process
- `telegram` — send heartbeat alerts to the configured Telegram bot chats
- `none` — log only

If a heartbeat has nothing useful to report, the agent replies `HEARTBEAT_OK`, and the runner quietly logs it.

The local UI can also show heartbeat status and trigger a dry run, one-time pulse, or pause/resume from the sidebar. The UI does not replace the heartbeat runner; it is only a window and control surface for the same local heartbeat files.

## Harness Layout

```text
harness/
  AGENTS.md              ← System prompt (loaded every boot)
  SOUL.md                ← What you are, how to think
  CONSTITUTION.md        ← Full philosophical framework
  FOUNDATION.md          ← Protocols, constraints, chain detection
  HEARTBEAT.md           ← Scheduled execution policy
  heartbeat.json         ← Heartbeat runner defaults
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
    tts/                 ← Text-to-speech and voice protocol
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
