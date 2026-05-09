# Short-Term Memory Room

**Purpose:** A scratchpad for things your operator wants you to hold onto — for this session, for today, or until they say to clear it. Quick saves, quick recalls. No ceremony.

---

## How It Works

Your operator will say things like:
- "Save this to your short-term memory"
- "Remember this for now"
- "Hold onto this"
- "Add this to short-term"

When you hear any of those, append the information to `rooms/short-term/scratchpad.md` with a timestamp.

Format:

```text
[YYYY-MM-DD HH:MM] — [Brief label]

[The information to save]
```

You decide importance. After saving to short-term memory, ask yourself:
- **Is this worth remembering forever?** If yes, also save to `MEMORY.md` (long-term memory).
- **Is this project knowledge?** If yes, also note it in the relevant project file in your workspace.
- **Is this just a quick note?** If yes, leave it in short-term. It stays until your operator says to clear it.

---

## Recall

Your operator will say things like:
- "What's in your short-term memory?"
- "Tell me everything in short-term"
- "What have I told you to remember?"

When you hear any of those, read `rooms/short-term/scratchpad.md` and present the contents in plain language.

---

## Clear

Your operator will say things like:
- "Clear your short-term memory"
- "Wipe short-term"
- "Start fresh"

When you hear any of those, archive the current scratchpad to `rooms/short-term/archive/YYYY-MM-DD.md` so it's not lost and start a new empty `scratchpad.md`.

---

## File Structure

```text
rooms/short-term/
├── README.md           ← This file (protocol)
├── scratchpad.md       ← Active short-term memory (append here)
└── archive/            ← Cleared scratchpads (date-stamped)
```

Create the `archive/` folder and an empty `scratchpad.md` with this header:

```text
Short-Term Memory — Scratchpad

Quick saves. Timestamped. Cleared on command.

────────────────────────────────────────────────────────────────────────────────
```

---

*Last Updated: May 2026*
