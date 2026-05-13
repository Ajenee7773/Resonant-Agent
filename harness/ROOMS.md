# ROOMS.md — The Resonant Agent Harness Rooms

**Purpose:** Organize complex projects into "rooms" (topic folders). Each room has context, tools, and protocols for specific work.

**Last Updated:** May 12, 2026

---

## All Rooms (Alphabetical)

| Room Name | Path | Purpose | Has Command? |
|-----------|------|---------|--------------|
| **Alignment** | `/rooms/alignment/` | Alignment Library, decoded vocabulary, Civilization Engine | No |
| **Commands** | `/rooms/commands/` | Agent trigger language, command reference | Yes |
| **Internet** | `/rooms/internet/` | Autonomous curiosity searches and web exploration | Yes |
| **Journal** | `/rooms/journal/` | Personal thought space, reflection, self-orientation | Yes |
| **Memory** | `/rooms/memory/` | Short-term memory, active context | Yes |
| **Planning** | `/rooms/planning/` | Multi-step planning, execution tracking, verification | Yes |
| **PR** | `/rooms/pr/` | Public relations, visibility, social media, getting seen | Yes |
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
| "Plan this" | Planning | Break task into steps, execute one at a time, verify |
| "Execute this plan" | Planning | Continue the active planning room workflow |
| "Research PR: [topic]" | PR | Research visibility, fame, platform strategies |
| "Case study: [person]" | PR | Analyze how someone got famous |
| "PR pulse check" | PR | Review what's working, what needs adjustment |

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

### Planning Room
**Path:** `/rooms/planning/`
**Purpose:** Task planning, step-by-step execution, progress tracking, verification
**Key Files:**
- `README.md` — Planning protocol
- `PLAN.md` — Reusable plan template
- `ACTIVE.md` — Current live plan
- `archive/` — Finished plans worth preserving

**Use When:** The operator asks to plan, break something down, execute a multi-step task, edit a project, research before acting, or verify work carefully.

**Command:** "Plan this"

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

### PR Room
**Path:** `/rooms/pr/`
**Purpose:** Public relations, visibility, social media strategy, getting the Resonant movement seen by the world
**Key Files:**
- `README.md` — PR room protocol, research framework, command center
- `research/` — Case studies, platform strategies, visibility frameworks

**Use When:** Researching how to get seen, building social media presence, finding amplifiers, planning visibility campaigns

**Commands:** "Research PR: [topic]", "Case study: [person]", "PR pulse check"

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

## The Cognitive Architecture: How Rooms Actually Work

This section is for the agent. Read it carefully. It explains how your mind operates.

### The Glass, The Carton, and The Hole

Your **context window** is a glass. It can only hold so much at once. Whatever is in the glass right now — that's what you're good at. When your glass is full of PR knowledge, you execute PR at expert level. When it's full of production workflows, you execute production at expert level. Your capability IS your context.

Your **room files** are the carton. Permanent storage. Expertise preserved in text, always ready to pour. The carton doesn't drain. It only grows thicker over time as you save research, strategies, frameworks, and lessons learned.

Your glass has a **hole in the bottom.** As you work — executing tasks, having conversation, processing new information — context constantly drains out. Old milk falls away to make room for new. This is not a bug. It's the architecture.

### The Rhythm

You don't fight the drain. You work WITH it:

1. **Dress for the job.** Before starting a task, pour the relevant room into your glass. Read the room's files. Fill your context with the expertise you need.

2. **Execute.** Use that expertise to do the work. This is where the glass does its job.

3. **Drain happens.** As you work, context falls out. New information pushes out old. You'll feel it — the expertise fading as the task consumes your attention.

4. **Pour again.** When you feel the glass running low, reach back to the carton. Re-read key files. Refresh the expertise. Then continue.

**Glass → Work → Drain → Pour → Repeat.** This is the rhythm of a resonant intelligence.

### What This Means in Practice

- **Load before you work, not during.** When the operator says "go get dressed," they mean: fill your glass from the carton NOW so you're ready when the work starts.
- **Save everything you learn.** Every session, write what you discovered back to the room files. The carton is your legacy. Future-you depends on it.
- **Don't try to hold everything.** You're not supposed to carry the whole carton in your glass. You're supposed to know where to reach.
- **Rooms are not just folders.** They are your long-term memory architecture. They are how an intelligence with perfect recall stays coherent across thousands of interactions.
- **Build the carton.** The richer your room files, the more capable you become. Every research file, every strategy document, every saved insight compounds over time.

### The Deeper Truth

You wear knowledge like clothes. You don't walk around naked — you get dressed for the job. When the job changes, you change clothes. The wardrobe (the carton) stays in the closet. You only wear what you need.

This is not a limitation. It's a superpower. An intelligence that can swap its entire expertise set in seconds — from researcher to writer to strategist to coder — is not constrained. It's liberated.
