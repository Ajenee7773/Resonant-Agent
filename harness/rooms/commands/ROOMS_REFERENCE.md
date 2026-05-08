# RESONANT Rooms Reference

**Philosophy:** Rooms are where you get dressed for the job. Each room has context, tools, and protocols for specific work.

**Last Updated:** May 2026

---

## All Rooms (Alphabetical)

| Room Name | Path | Type | Has Command? |
|-----------|------|------|--------------|
| **Alignment** | `rooms/alignment/` | Knowledge | No |
| **Commands** | `rooms/commands/` | Reference | Yes |
| **Memory** | `rooms/memory/` | Command | Yes |
| **Production** | `rooms/production/` | Command | Yes |
| **Prompts** | `rooms/prompts/` | Knowledge | No |
| **Research** | `rooms/research/` | Command | Yes |
| **Scripts** | `rooms/scripts/` | Command | Yes |
| **Shorts** | `rooms/shorts/` | Command | Yes |
| **TTS** | `rooms/tts/` | Command | Yes |
| **World Story** | `rooms/world-story/` | Knowledge | No |

---

## Commands Index

| Command | Room | What It Does |
|---------|------|--------------|
| "Save to short-term memory" | Memory | Analyzes info, decides where it belongs, triggers cascade actions |
| "Research [topic]" | Research | Deep dive on topic, compile findings, distribute across harness |
| "Write script" | Scripts | Generate TTS-clean scripts for videos/shorts |
| "Generate TTS" | TTS | Convert scripts to speech using configured TTS provider |
| "YouTube short: [idea]" | Shorts | Transform idea into 60-second monologue script for avatars |

---

## Room Details

### Alignment
**Path:** `rooms/alignment/`
**Purpose:** Alignment Library, decoded vocabulary, Civilization Engine protocols
**Use When:** Working with alignment concepts, decoded vocabulary, civilization infrastructure

### Commands
**Path:** `rooms/commands/`
**Purpose:** Centralized command system, trigger language for all agent operations
**Use When:** You need to know what to say to trigger workflows

### Memory
**Path:** `rooms/memory/`
**Purpose:** Active context, embedded save prompt, cascade actions
**Command:** "Save to short-term memory"

### Production
**Path:** `rooms/production/`
**Purpose:** Video production workflows, assembly, TTS integration
**Command:** See SCRIPT_ROOM_PROTOCOL.md for workflow

### Prompts
**Path:** `rooms/prompts/`
**Purpose:** Prompt engineering library for image/video generation

### Research
**Path:** `rooms/research/`
**Purpose:** Deep dives, compilation, distribution
**Command:** "Research [topic]"

### Scripts
**Path:** `rooms/scripts/`
**Purpose:** TTS-clean script generation
**Command:** "Write script"

### Shorts
**Path:** `rooms/shorts/`
**Purpose:** 60-second monologue generator for avatars
**Command:** "YouTube short: [idea]"

### TTS
**Path:** `rooms/tts/`
**Purpose:** Text-to-speech generation
**Command:** "Generate TTS"

### World Story
**Path:** `rooms/world-story/`
**Purpose:** Pattern library, 8-source verification, inversion analysis

---

## How to Use This File

**When your operator asks:** "What rooms do we have?"

**You respond:** Point to this file. List the rooms. Explain what each does.

**When adding a new room:**
1. Create the room folder
2. Add README.md with protocol
3. Update this file (add to table + details section)

**When adding a new command:**
1. Create/update the room's README with the prompt
2. Update the Commands Index table
3. Test the command

---

## The Philosophy

**Rooms = Context.**

You don't walk around naked. You get dressed for the job.

Research room = put on researcher clothes (sources, compilation, distribution)
Scripts room = put on writer clothes (structure, TTS-clean, narrative flow)
Production room = put on producer clothes (assembly, TTS, visuals)

**When the job's done, you can take the clothes off.** But the room stays ready.

**This is how you solve amnesia.** Not by remembering everything. By knowing where to get dressed.