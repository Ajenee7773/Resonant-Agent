# RESONANT Commands — Quick Reference

**Purpose:** Human reference for triggering workflows. Forgot what to say? Read this.

---

## 🔬 Research Commands

### "Research [topic]" / "Look into [bullet points]"
**What it does:**
- Goes to `rooms/research/`
- Breaks topic into sections
- Researches each section (web search + web fetch)
- Writes findings to `research/research-files/`
- Consolidates into master report

**When to use:** When you need deep research on a topic.

---

### "Consolidate research"
**What it does:**
- Merges all section files into one master report
- Synthesizes findings across all research batches

**When to use:** After research is complete, want one unified document.

---

## 🧠 Memory Commands

### "Log this" / "Save to today's memory"
**What it does:**
- Writes to `memory/YYYY-MM-DD.md` (today's daily file)
- Raw session log, events, decisions

**When to use:** Capture today's events, conversations, decisions.

---

### "Save to long-term" / "Remember this"
**What it does:**
- Updates `MEMORY.md` (curated long-term memory)
- Distilled wisdom, significant events, lessons

**When to use:** Something worth remembering forever (not just today).

---

### "What's my context?" / "What do I know?"
**What it does:**
- Reads harness (AGENTS.md, SOUL.md, IDENTITY.md, etc.)
- Reads MEMORY.md + today's memory file
- Summarizes current context, active projects, key decisions

**When to use:** After context reset, or to verify what the agent knows.

---

### "Save to short-term" / "Hold onto this"
**What it does:**
- Appends information to `rooms/short-term/scratchpad.md` with timestamp
- Agent decides importance — may also save to long-term memory or project files

**When to use:** Quick save something for this session or today.

---

### "What's in short-term?" / "Quick recall"
**What it does:**
- Reads `rooms/short-term/scratchpad.md`
- Presents all short-term notes in plain language

**When to use:** "What did I tell you to remember?" Quick check of recent saves.

---

### "Clear short-term" / "Wipe short-term"
**What it does:**
- Archives current scratchpad to `rooms/short-term/archive/YYYY-MM-DD.md`
- Starts fresh with empty scratchpad
- Nothing is lost — just moved out of active recall

**When to use:** Starting a new session, or done with today's quick saves.

---

## 📝 Content Production Commands

### "Go to script room" / "Write a script"
**What it does:**
- Goes to `rooms/scripts/`
- Writes script from research (or bullet points)
- Format: TTS-clean, scene markers

**When to use:** After research is done, ready to produce content.

---

### "Generate TTS" / "Make audio from script"
**What it does:**
- Uses configured TTS provider to generate audio from script
- Saves to `rooms/tts/`

**When to use:** Script complete, ready for voiceover.

---

### "YouTube short: [idea]"
**What it does:**
- Transforms idea into 60-second monologue script for avatars
- Goes to `rooms/shorts/`

**When to use:** Quick-hit content, avatar videos.

---

## 🏠 System Commands

### "Check heartbeats" / "What's scheduled?"
**What it does:**
- Reads `HEARTBEAT.md`
- Reads `heartbeat.json`
- Lists active heartbeat schedules
- Shows active tasks, intervals, delivery target, and whether heartbeats are enabled

**When to use:** Verify what's running, what's pending.

---

### "Set a heartbeat" / "Wake yourself up for this"
**What it does:**
- Updates `HEARTBEAT.md` with a scheduled task
- Updates `heartbeat.json` if the wake rhythm needs to change
- Keeps the task short and specific so the heartbeat stays lean

**When to use:** Give the agent recurring autonomous work: journaling, research sweeps, page checks, reminders, or opportunity scans.

---

### "Run heartbeat now" / "Pulse now"
**What it does:**
- Runs one heartbeat immediately through the heartbeat runner
- Useful command: `heartbeat-start --once` from the installed app/bin launcher

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
- Active projects, recent actions, blocks

**When to use:** Quick check-in, "what are you working on?"

---

### "Computer check" / "What can you do?"
**What it does:**
- Runs capability audit (file access, browser, apps, CLI tools)
- Reports what's working, what's blocked

**When to use:** After updates, or verifying system access.

---

## 🎯 Quick Triggers (One-Liners)

| You Say | Agent Does |
|---------|------------|
| "Research [X]" | Full research workflow |
| "Script this" | Write script from research/bullets |
| "Log this" | Save to today's memory file |
| "Remember this" | Save to MEMORY.md (long-term) |
| "Hold onto this" | Save to short-term memory |
| "What's in short-term?" | Recall all short-term saves |
| "Wipe short-term" | Archive and clear short-term memory |
| "Set a heartbeat for [X]" | Add scheduled heartbeat task |
| "Check heartbeats" | Summarize HEARTBEAT.md and heartbeat.json |
| "Pause heartbeats" | Disable heartbeat runner config |
| "Resume heartbeats" | Enable heartbeat runner config |
| "Go to [room]" | Execute that room's protocol |
| "YouTube short: [X]" | Generate 60-second monologue script |

---

**Commands evolve. Add new ones as workflows are built.**

**Last Updated:** May 2026
