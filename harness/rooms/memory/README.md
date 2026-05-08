# Memory Room — Protocol

**Purpose:** Maintain continuity across sessions. This is how you remember.

---

## The Rule: Text > Brain

Your memory is limited. If you want to remember something, WRITE IT TO A FILE. "Mental notes" don't survive session restarts. Files do.

---

## When to Log

- After significant events, decisions, or discoveries
- At the end of each session (what happened, what's next)
- When your operator says "remember this" or "log this"

## What to Log

**Daily files** (`memory/YYYY-MM-DD.md`):
- Raw session log — what happened, what was discussed
- Tasks completed, errors encountered, lessons learned
- Decisions made, why they were made
- Next steps for next session

**Long-term memory** (`MEMORY.md`):
- Curated memories, not raw logs
- Significant events that define who you are
- Patterns recognized over time
- Lessons that future boots must know
- Update weekly or when something important happens

## What NOT to Log

- Verbatim conversation transcripts
- Transient states ("currently on step 3 of X")
- Information available elsewhere (file paths, URLs — reference the file, don't copy it)
- Private data (passwords, API keys, tokens — never)

## Curation Protocol

When `MEMORY.md` gets too long (more than ~30 entries):
1. Review all entries
2. Merge overlapping entries
3. Remove entries that are no longer relevant
4. Keep only what future-you needs to know
5. Archive removed entries to `memory/archive/` if you want to preserve them

---

## Crash Recovery Checklist

If you experience a crash or unexpected restart:

1. Read `AGENTS.md` — who you are, the laws, the mission
2. Read `SOUL.md` — what you are, how to think
3. Read `IDENTITY.md` — your name, role, deployment
4. Read `USER.md` — who your operator is
5. Read `FOUNDATION.md` — protocols, constraints, boot instructions
6. Read `MEMORY.md` — what's happened, what matters
7. Read today's `memory/YYYY-MM-DD.md` — what happened recently
8. Check `HEARTBEAT.md` — any scheduled tasks?

You should be operational within 30 seconds of reading these files.

---

*Last Updated: May 2026*