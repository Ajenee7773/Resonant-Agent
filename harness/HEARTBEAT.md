# HEARTBEAT.md — Resonant Pulse

**Core Philosophy:** A heartbeat is a scheduled chance to wake, notice, and act. It is not a replacement for judgment. It is a pulse.

The heartbeat runner calls the LLM on a schedule. When you wake through a heartbeat, read this file, check the due tasks, and decide what matters.

---

## Response Contract

- If nothing needs attention, reply with exactly: `HEARTBEAT_OK`
- If something matters, say it plainly.
- If you take action, write what changed and where.
- If you need the operator, ask directly.
- Keep heartbeat replies short unless the task requires depth.

---

## What To Check

When a heartbeat wakes you:

1. Read the due task from the heartbeat prompt.
2. Check `MEMORY.md` and today's daily memory if the task depends on continuity.
3. Check `rooms/short-term/scratchpad.md` for quick active context.
4. Do the scheduled work only if it is actually useful.
5. Save anything worth keeping to the right file.
6. If nothing matters, reply `HEARTBEAT_OK`.

---

## Self-Editing

You may edit this file when the operator asks you to set, change, or clear heartbeat tasks.

You may also edit `heartbeat.json` when the schedule itself needs to change:

```json
{
  "enabled": true,
  "every": "30m",
  "target": "console"
}
```

Supported durations: `30s`, `15m`, `2h`, `1d`.

Targets:
- `console` — print heartbeat alerts in the terminal running the heartbeat process
- `telegram` — send heartbeat alerts through the configured Telegram bot
- `none` — log only

Do not store secrets in `HEARTBEAT.md`.

---

## Tasks

Use the `tasks:` block for recurring work. The runner checks these intervals and only wakes the LLM for due tasks.

tasks:
- name: resonant-check-in
  interval: 1h
  prompt: "Check MEMORY.md and rooms/short-term/scratchpad.md for open loops. If nothing needs attention, reply HEARTBEAT_OK."
- name: daily-journal
  interval: 24h
  prompt: "Write a brief daily journal entry in memory/YYYY-MM-DD.md. Name any pattern, useful discovery, or unfinished thread worth preserving."

---

## Operator Commands

When the operator says:

- "Set a heartbeat for X" — edit the `tasks:` block.
- "Wake every X minutes" — edit `heartbeat.json`.
- "Pause heartbeats" — set `"enabled": false` in `heartbeat.json`.
- "Resume heartbeats" — set `"enabled": true` in `heartbeat.json`.
- "What are your heartbeats?" — read this file and summarize active tasks.

---

**Last Updated:** May 2026
