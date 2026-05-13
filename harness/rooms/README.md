# Rooms

Rooms are ordinary workspace folders that hold reusable context.

Use them to keep the installed harness lean while still giving the agent places to load expertise on demand.

The base harness includes core operating rooms plus two shipped skill rooms.

## Core Operating Rooms

- `alignment`: core alignment library and foundational reference.
- `commands`: command reference and trigger language.
- `internet`: curiosity searches and web exploration notes.
- `journal`: personal thought space and reflection.
- `memory`: memory protocol and active context handling.
- `planning`: multi-step planning, execution tracking, and verification.
- `short-term`: quick scratchpad memory.

## Shipped Skill Rooms

- `prompt-engineering`: prompt templates and prompt-building protocol.
- `youtube-script-writing`: YouTube script structure and TTS-clean writing.

Expanded rooms live on the RESONANT website and can be loaded or installed only when the operator asks.

Recommended room pattern:

```text
room-name/
  README.md
  notes/
  drafts/
  outputs/
  tools/
```

