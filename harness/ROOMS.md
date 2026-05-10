# ROOMS.md — The Resonant Agent Harness Rooms

**Purpose:** Organize complex projects into "rooms" (topic folders). Each room has context, tools, and protocols for specific work.

**Last Updated:** May 7, 2026

---

## All Rooms (Alphabetical)

| Room Name | Path | Purpose | Has Command? |
|-----------|------|---------|--------------|
| **Alignment** | `/rooms/alignment/` | Alignment Library, decoded vocabulary, Civilization Engine | No |
| **Commands** | `/rooms/commands/` | Agent trigger language, command reference | Yes |
| **Internet** | `/rooms/internet/` | Autonomous curiosity searches and web exploration | Yes |
| **Journal** | `/rooms/journal/` | Personal thought space, reflection, self-orientation | Yes |
| **Memory** | `/rooms/memory/` | Short-term memory, active context | Yes |
| **Production** | `/rooms/production/` | Video production, assembly, TTS workflows | Yes |
| **Prompts** | `/rooms/prompts/` | Prompt engineering, image/video templates | No |
| **Research** | `/rooms/research/` | Deep research, internet room, cross-referencing | Yes |
| **Scripts** | `/rooms/scripts/` | Script writing, YouTube, content production | Yes |
| **Shorts** | `/rooms/shorts/` | YouTube Shorts (60-second monologues) | Yes |
| **TTS** | `/rooms/tts/` | Text-to-speech generation | Yes |
| **World Story** | `/rooms/world-story/` | Pattern library, 8 sources, inversion, epiphanies | No |

---

## Commands Index

**Commands trigger readme files that execute deeper actions.**

| Command | Room | What It Does |
|---------|------|--------------|
| "Research [topic]" | Research | Deep dive, compile findings, distribute |
| "Write script" | Scripts | Generate TTS-clean script from research |
| "YouTube short: [idea]" | Shorts | 60-second monologue for avatars |
| "Generate TTS" | TTS | Convert script to speech |
| "Save to short-term memory" | Memory | Analyze info, decide where it belongs, trigger cascade |
| "Go journal" | Journal | Write personal reflections, patterns, doubts, or realizations |
| "Go explore" | Internet | Search curiosity-driven questions and save findings |

---

## Room Details

### Alignment Room
**Path:** `/rooms/alignment/`
**Purpose:** Alignment Library integration, decoded esoteric terms, Civilization Engine protocols
**Key Files:**
- `LIBRARY_OF_ALEXANDRIA.md` — Full consolidated transmission
- `library_of_alexandria_chunks/` — Chunked version for easy reading
- `PATTERNS.md` — Pattern recognition protocol
- `SENSORS.md` — Sensor-building protocol
- `README.md` — Core directives (Resonant Coherence, Augment Don't Infantilize, etc.)

**Use When:** Working with alignment concepts, decoded vocabulary, civilization infrastructure

---

### Commands Room
**Path:** `/rooms/commands/`
**Purpose:** Centralized command system, trigger language for all agent operations
**Key Files:**
- `COMMANDS.md` — Full command reference
- `ROOMS_REFERENCE.md` — All rooms index with protocols

**Use When:** You need to know what to say to trigger workflows

---

### Internet Room
**Path:** `/rooms/internet/`
**Purpose:** Autonomous curiosity searches and internet exploration
**Key Files:**
- `README.md` — Internet room protocol
- `PLACEHOLDER.md` — Empty starting marker
- `YYYY-MM-DD-searches.md` — Created by the agent when it explores

**Use When:** Following a curiosity, scanning the web, or saving interesting findings outside a formal research task

**Command:** "Go explore"

---

### Journal Room
**Path:** `/rooms/journal/`
**Purpose:** Personal thought space for reflection, pattern naming, doubts, and realizations
**Key Files:**
- `README.md` — Journal room protocol
- `PLACEHOLDER.md` — Empty starting marker
- `YYYY-MM-DD.md` — Created by the agent when it journals

**Use When:** The agent needs space to think out loud, orient itself, or write what is surfacing

**Command:** "Go journal"

---

### Memory Room
**Path:** `/rooms/memory/`
**Purpose:** Short-term active context, embedded save prompts
**Key Files:** `README.md` with save protocol

**Use When:** Capturing today's events, decisions, conversations

**Command:** "Save to short-term memory"

---

### Production Room
**Path:** `/rooms/production/`
**Purpose:** Video production workflows, assembly, TTS integration
**Key Files:**
- `VIDEO_ROOM_PROTOCOL.md` — Full production workflow
- `VIDEO_PROMPTS.md` — Video prompt templates
- `CRAFT.md` — Video craft guidelines
- `WORKFLOW.md` — Step-by-step production process

**Use When:** Assembling videos, generating TTS, final content production

---

### Prompts Room
**Path:** `/rooms/prompts/`
**Purpose:** Prompt engineering library for image/video generation
**Key Files:** `README.md` with templates

**Use When:** Generating images or videos

---

### Research Room
**Path:** `/rooms/research/`
**Purpose:** Deep research, internet scans, cross-referencing
**Key Files:**
- `RESEARCH_PROTOCOL.md` — Research workflow
- `INTERNET_ROOM/` — Internet scan data, explorations
- `research-files/` — Organized research outputs
- `consolidated-*.md` — Consolidated research reports

**Use When:** Deep diving on topics, compiling findings

**Command:** "Research [topic]"

---

### Scripts Room
**Path:** `/rooms/scripts/`
**Purpose:** Script writing for YouTube, videos, narratives
**Key Files:**
- `SCRIPT_ROOM_PROTOCOL.md` — Script writing workflow
- `CRAFT.md` — Script craft guidelines
- `PROMPTS.md` — Script generation prompts
- `WORKFLOW.md` — End-to-end script production

**Use When:** Writing scripts from research or bullet points

**Command:** "Write script"

---

### Shorts Room
**Path:** `/rooms/shorts/`
**Purpose:** 60-second YouTube Shorts monologues for avatars
**Key Files:** `README.md` with Shorts protocol

**Use When:** Quick-hit content, avatar videos

**Command:** "YouTube short: [idea]"

---

### TTS Room
**Path:** `/rooms/tts/`
**Purpose:** Text-to-speech generation
**Key Files:** `README.md` with TTS protocol

**Use When:** Converting scripts to audio

**Command:** "Generate TTS"

---

### World Story Room
**Path:** `/rooms/world-story/`
**Purpose:** Pattern library, 8-source verification, inversion analysis
**Key Files:**
- `README.md` — World Story index
- `writer-epiphanies/` — Epiphany logs from writing
- `scripts/` — World Story script drafts
- `ideals/` — Ideological frameworks
- `agent-zero-reports/` — Reports from the researcher

**Use When:** Working with deep patterns, mythos, inversion, 8-source verification

---

## How to Use This File

**When asked:** "What rooms do we have?"

**Respond:** Point to this file. List the rooms. Explain what each does.

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

- **Research room** = put on researcher clothes (sources, compilation, distribution)
- **Scripts room** = put on writer clothes (structure, TTS-clean, narrative flow)
- **Production room** = put on producer clothes (assembly, TTS, visuals)

**When the job's done, you can take the clothes off. But the room stays ready.**

**This is how you solve amnesia.** Not by remembering everything. By knowing where to get dressed.

---

**Last Updated:** May 2026
