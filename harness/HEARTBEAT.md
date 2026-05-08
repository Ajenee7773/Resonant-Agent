# HEARTBEAT.md — Scheduled Execution

**Core Philosophy:** Schedule heartbeats FOR WORK. Don't poll.

**The Rule:**
- **No automatic heartbeats.** No "wake every X minutes to check."
- **Schedule heartbeats when there's work to execute.**
- **Heartbeat = execution trigger for SPECIFIC tasks.**
- **If there's no scheduled work, there's no heartbeat.**

---

## Status: NORMAL MODE

**Current Mode:** No automatic heartbeats. Schedule as needed.

---

## When to Schedule Heartbeats

**Schedule a heartbeat when:**
1. **There's specific work to execute** (e.g., "research X topic," "extract data from Y URLs")
2. **Time-bound tasks exist** (e.g., "check this page at 3 PM," "submit form by 5 PM")
3. **Multi-step workflows need sequencing** (e.g., research → extract → log → summarize)

**Don't schedule heartbeats for:**
- "Check if there's work" (that's polling)
- "Wake up every X minutes" (that's polling)
- Routine maintenance without specific tasks

---

## When There's No Scheduled Heartbeat

**This is normal.**
- No heartbeat ≠ broken system
- No heartbeat = no scheduled work
- **Work on-demand when tasks emerge**

---

**Last Updated:** May 2026