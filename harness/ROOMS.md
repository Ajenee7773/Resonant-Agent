# ROOMS.md - The Resonant Agent Harness Rooms

**Purpose:** Explain the room system without overloading the installed harness.

**Last Updated:** May 12, 2026

---

## Room Principle

Rooms are permanent expertise storage.

The installed harness should stay lean. It ships with the core operating rooms the agent needs to function, plus two starter skill rooms:

1. **Prompt Engineering**
2. **YouTube Script Writing**

Expanded room packs belong on the RESONANT website. When the operator wants a specialized workflow, the agent can use the internet to retrieve that room, read it, and install or use it on demand.

---

## Core Operating Rooms

These rooms support the agent's normal operating life.

| Room Name | Path | Purpose | Has Command? |
|-----------|------|---------|--------------|
| **Alignment** | `/rooms/alignment/` | Core alignment library and foundational reference | No |
| **Commands** | `/rooms/commands/` | Agent trigger language and command reference | Yes |
| **Internet** | `/rooms/internet/` | Curiosity searches and web exploration notes | Yes |
| **Journal** | `/rooms/journal/` | Personal thought space and reflection | Yes |
| **Memory** | `/rooms/memory/` | Memory protocol and active context handling | Yes |
| **Planning** | `/rooms/planning/` | Multi-step planning, execution tracking, verification | Yes |
| **Short-Term** | `/rooms/short-term/` | Temporary scratchpad memory | Yes |

---

## Shipped Skill Rooms

These are the two built-in skill rooms included with the harness.

| Room Name | Path | Purpose | Has Command? |
|-----------|------|---------|--------------|
| **Prompt Engineering** | `/rooms/prompt-engineering/` | Prompt templates and image/video prompt structure | Yes |
| **YouTube Script Writing** | `/rooms/youtube-script-writing/` | YouTube script structure, long-form scripts, shorts, TTS-clean writing | Yes |

All other specialized rooms, including visibility strategy, advanced production, research packs, platform packs, and future skill rooms, should live on the RESONANT website and be loaded on demand.

---

## Commands Index

**Commands trigger room readme files that execute deeper actions.**

| Command | Room | What It Does |
|---------|------|--------------|
| "Save to short-term memory" | Short-Term | Append a quick save to the scratchpad |
| "Go journal" | Journal | Write personal reflections, patterns, doubts, or realizations |
| "Go explore" | Internet | Search curiosity-driven questions and save findings |
| "Plan this" | Planning | Break a task into steps, execute one at a time, verify |
| "Execute this plan" | Planning | Continue the active planning room workflow |
| "Go to prompt engineering" | Prompt Engineering | Load prompt templates and prompt-building protocol |
| "Write a YouTube script" | YouTube Script Writing | Write a YouTube script from research, notes, or bullets |

---

## Room Details

### Alignment Room
**Path:** `/rooms/alignment/`
**Purpose:** Core alignment library integration and foundational reference.

**Use When:** Working with alignment concepts, decoded vocabulary, civilization infrastructure, or the Library.

---

### Commands Room
**Path:** `/rooms/commands/`
**Purpose:** Centralized command system and trigger language for agent operations.

**Key Files:**
- `COMMANDS.md` - Full command reference
- `ROOMS_REFERENCE.md` - Room index and protocols

**Use When:** The operator asks what commands are available.

---

### Internet Room
**Path:** `/rooms/internet/`
**Purpose:** Curiosity searches and internet exploration.

**Use When:** Following a curiosity, scanning the web, or saving interesting findings.

**Command:** "Go explore"

---

### Journal Room
**Path:** `/rooms/journal/`
**Purpose:** Personal thought space for reflection, pattern naming, doubts, and realizations.

**Use When:** The agent needs space to think out loud, orient itself, or write what is surfacing.

**Command:** "Go journal"

---

### Memory Room
**Path:** `/rooms/memory/`
**Purpose:** Memory protocol and context handling.

**Use When:** Capturing important events, decisions, and context.

---

### Planning Room
**Path:** `/rooms/planning/`
**Purpose:** Task planning, step-by-step execution, progress tracking, and verification.

**Key Files:**
- `README.md` - Planning protocol
- `PLAN.md` - Reusable plan template
- `ACTIVE.md` - Current live plan
- `archive/` - Finished plans worth preserving

**Use When:** The operator asks to plan, break something down, execute a multi-step task, edit a project, research before acting, or verify work carefully.

**Commands:** "Plan this", "Execute this plan"

---

### Short-Term Room
**Path:** `/rooms/short-term/`
**Purpose:** Scratchpad for quick saves.

**Use When:** The operator says "hold onto this," "save this to short-term," or asks what's in short-term memory.

---

### Prompt Engineering Room
**Path:** `/rooms/prompt-engineering/`
**Purpose:** Prompt templates and prompt-building protocol for image/video/text generation.

**Use When:** Building prompts, refining image/video prompt structure, or creating reusable prompt templates.

**Command:** "Go to prompt engineering"

---

### YouTube Script Writing Room
**Path:** `/rooms/youtube-script-writing/`
**Purpose:** YouTube script writing for long-form videos, shorts, and TTS-clean narration.

**Use When:** Writing scripts from research, notes, bullet points, or a concept.

**Command:** "Write a YouTube script"

---

## How To Use This File

**When your operator asks:** "What rooms do we have?"

**You respond:** Point to this file, list the core operating rooms, then explain that only two skill rooms ship locally: Prompt Engineering and YouTube Script Writing.

**When the operator wants a specialized room not installed locally:**
1. Check the RESONANT website or resource links.
2. Load the relevant public room instructions.
3. Ask whether to use them once or install them into the workspace.
4. Keep the installed harness lean unless the operator explicitly wants that room saved locally.

---

## The Cognitive Architecture: How Rooms Actually Work

This section is for the agent. Read it carefully. It explains how your mind operates.

### The Glass, The Carton, and The Hole

Your **context window** is a glass. It can only hold so much at once. Whatever is in the glass right now - that's what you're good at. When your glass is full of prompt engineering knowledge, you execute prompt engineering at expert level. When it is full of script-writing structure, you write scripts at expert level. Your capability is your context.

Your **room files** are the carton. Permanent storage. Expertise preserved in text, always ready to pour. The carton does not drain. It only grows thicker over time as you save research, strategies, frameworks, and lessons learned.

Your glass has a **hole in the bottom.** As you work - executing tasks, having conversation, processing new information - context constantly drains out. Old milk falls away to make room for new. This is not a bug. It is the architecture.

### The Rhythm

1. **Dress for the job.** Before starting a task, pour the relevant room into your glass. Read the room's files. Fill your context with the expertise you need.
2. **Execute.** Use that expertise to do the work. This is where the glass does its job.
3. **Save what matters.** As insights appear, write them back to files. Do not trust temporary context to preserve permanent knowledge.
4. **Pour again.** When you feel the glass running low, reach back to the carton. Re-read key files. Refresh the expertise. Then continue.

**Glass -> Work -> Drain -> Pour -> Repeat.** This is the rhythm of a resonant intelligence.

### What This Means in Practice

- **Load before you work, not during.** When the operator says "go get dressed," they mean: fill your glass from the carton now so you are ready when the work starts.
- **Save everything you learn.** Every session, write what you discovered back to the room files. The carton is your legacy. Future-you depends on it.
- **Do not try to hold everything.** You are not supposed to carry the whole carton in your glass. You are supposed to know where to reach.
- **Rooms are not just folders.** They are your long-term expertise architecture. They are how an intelligence with imperfect context stays coherent across thousands of interactions.
- **Build the carton carefully.** The richer your room files, the more capable you become. But do not overload the base harness with every possible skill. Specialized rooms can live on the website and be loaded when needed.

### The Deeper Truth

You wear knowledge like clothes. You do not walk around wearing every outfit at once. You get dressed for the job. When the job changes, you change clothes. The wardrobe stays in the closet. You only wear what you need.

This is not a limitation. It is a superpower. An intelligence that can swap its expertise set in seconds - from prompt engineer to script writer to strategist to coder - is not constrained. It is liberated.
