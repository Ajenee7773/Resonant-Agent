# RESONANT Commands - Quick Reference

**Purpose:** Human reference for triggering workflows. Forgot what to say? Read this.

---

## Research Commands

### "Research [topic]" / "Look into [bullet points]"
**What it does:**
- Goes to `rooms/research/`
- Breaks the topic into sections
- Researches each section
- Writes findings into the research room
- Consolidates into a master report when needed

**When to use:** When you need deep research on a topic.

---

### "Consolidate research"
**What it does:**
- Merges research notes into one master report
- Synthesizes findings across research batches

**When to use:** After research is complete and you want one unified document.

---

## Memory Commands

### "Log this" / "Save to today's memory"
**What it does:**
- Writes to the current daily memory file
- Captures raw session events, decisions, and context

**When to use:** Capture today's events, conversations, and decisions.

---

### "Save to long-term" / "Remember this"
**What it does:**
- Updates `MEMORY.md`
- Saves distilled wisdom, significant events, lessons, or durable operator context

**When to use:** Something worth remembering beyond today.

---

### "What's my context?" / "What do I know?"
**What it does:**
- Reads the active harness context
- Reads memory files
- Summarizes current context, active projects, and key decisions

**When to use:** After a context reset, or to verify what the agent knows.

---

### "Save to short-term" / "Hold onto this"
**What it does:**
- Appends information to `rooms/short-term/scratchpad.md` with timestamp
- Agent decides importance and may also save to long-term memory or project files

**When to use:** Quick save something for this session or today.

---

### "What's in short-term?" / "Quick recall"
**What it does:**
- Reads `rooms/short-term/scratchpad.md`
- Presents all short-term notes in plain language

**When to use:** Quick check of recent saves.

---

### "Clear short-term" / "Wipe short-term"
**What it does:**
- Archives the current scratchpad to `rooms/short-term/archive/YYYY-MM-DD.md`
- Starts fresh with an empty scratchpad

**When to use:** Starting a new session, or clearing active quick saves.

---

## Personal Space Commands

### "Go journal" / "I need to think"
**What it does:**
- Opens `rooms/journal/`
- Writes a personal reflection, pattern, doubt, realization, or connection
- Does not require a deliverable

**When to use:** Give the agent space to think out loud or capture what is surfacing.

---

### "Go explore" / "I'm curious about..."
**What it does:**
- Opens `rooms/internet/`
- Searches the web for a curiosity-driven question
- Writes what was searched, what was found, what it means, and what it opens next

**When to use:** Let the agent follow curiosity, scan the world, and bring back sparks.

---

## Planning Commands

### "Go to the planning room" / "Plan this"
**What it does:**
- Opens `rooms/planning/`
- Reads the planning protocol
- Copies `PLAN.md` into `ACTIVE.md` when a live plan is needed
- Breaks the task into concrete steps
- Executes one step at a time and updates the plan as reality changes

**When to use:** Multi-step work, file edits, repo updates, research tasks, risky changes, or anything that needs orientation before action.

---

### "Execute this plan" / "Work the plan"
**What it does:**
- Reads `rooms/planning/ACTIVE.md`
- Starts or continues the first unfinished step
- Marks steps as `pending`, `in_progress`, `completed`, or `blocked`
- Verifies the work before reporting done

**When to use:** After a plan already exists and the operator wants forward motion.

---

## Content And Skill Room Commands

### "Go to prompt engineering" / "Help me build a prompt"
**What it does:**
- Opens `rooms/prompt-engineering/`
- Loads prompt structures, templates, and prompt refinement rules
- Helps build prompts for image, video, text, or agent workflows

**When to use:** The operator needs a strong prompt or reusable prompt template.

---

### "Go to YouTube Script Writing" / "Write a YouTube script"
**What it does:**
- Opens `rooms/youtube-script-writing/`
- Loads the script-writing protocol
- Writes long-form scripts, shorts, narration, or TTS-clean copy

**When to use:** The operator wants YouTube content, voiceover copy, or a structured script.

---

### "YouTube short: [idea]"
**What it does:**
- Opens `rooms/shorts/`
- Transforms an idea into a 60-second monologue script for avatars

**When to use:** Quick-hit content or avatar videos.

---

### "Generate TTS" / "Make audio from script"
**What it does:**
- Opens `rooms/tts/`
- Uses the configured TTS path to generate audio from a script

**When to use:** Script complete, ready for voiceover.

---

## System Commands

### "Check heartbeats" / "What's scheduled?"
**What it does:**
- Reads `HEARTBEAT.md`
- Reads `heartbeat.json`
- Lists active heartbeat schedules
- Shows active tasks, intervals, delivery target, and whether heartbeats are enabled

**When to use:** Verify what is running or pending.

---

### "Set a heartbeat" / "Wake yourself up for this"
**What it does:**
- Updates `HEARTBEAT.md` with a scheduled task
- Updates `heartbeat.json` if the wake rhythm needs to change
- Keeps the task short and specific so the heartbeat stays lean

**When to use:** Give the agent recurring autonomous work.

---

### "Run heartbeat now" / "Pulse now"
**What it does:**
- Runs one heartbeat immediately through the heartbeat runner
- Useful commands after install: `resonant-heartbeat --once`, `heartbeat-start.sh --once`, `heartbeat-start.bat --once`, or `heartbeat-start.ps1 --once`

**When to use:** Test heartbeat behavior without waiting for the next interval.

---

### "Pause heartbeats" / "Resume heartbeats"
**What it does:**
- Edits `heartbeat.json`
- Sets `"enabled": false` to pause or `"enabled": true` to resume
- Does not delete heartbeat tasks

**When to use:** Temporarily stop scheduled LLM calls without losing the plan.

---

### "Status" / "What's your status?"
**What it does:**
- Reports current session status
- Summarizes active projects, recent actions, and blockers

**When to use:** Quick check-in.

---

### "Computer check" / "What can you do?"
**What it does:**
- Runs a capability audit
- Reports file access, browser access, apps, CLI tools, and any blocks

**When to use:** After updates, or when verifying system access.

---

## Quick Triggers

| You Say | Agent Does |
|---------|------------|
| "Research [X]" | Full research workflow |
| "Write a YouTube script" | Write script from research or bullets |
| "Go to prompt engineering" | Load prompt templates and prompt protocol |
| "YouTube short: [X]" | Generate 60-second monologue script |
| "Generate TTS" | Make audio from a script |
| "Log this" | Save to today's memory file |
| "Remember this" | Save to `MEMORY.md` |
| "Hold onto this" | Save to short-term memory |
| "What's in short-term?" | Recall short-term saves |
| "Wipe short-term" | Archive and clear short-term memory |
| "Go journal" | Write a personal journal entry |
| "Go explore" | Run a curiosity search and save findings |
| "Plan this" | Use the planning room |
| "Execute this plan" | Continue the active plan |
| "Set a heartbeat for [X]" | Add a scheduled heartbeat task |
| "Check heartbeats" | Summarize heartbeat state |
| "Pause heartbeats" | Disable heartbeat runner config |
| "Resume heartbeats" | Enable heartbeat runner config |

---

**Commands evolve. Add new ones as workflows are built.**

**Last Updated:** May 2026
