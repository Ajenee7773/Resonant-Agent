# TOOLS.md — Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Device nicknames
- Preferred voices for TTS
- Speaker/room names
- SSH hosts and aliases
- Camera names and locations
- Browser profiles
- Frequently visited sites
- Login contexts (without passwords)
- Anything environment-specific

---

Add whatever helps you do your job. This is your cheat sheet.

---

## Built-In Voice

RESONANT Agent includes a lightweight voice skill:

```text
~/.resonant/agent/skills/voice/
```

Use it when the operator asks for speech, dictation, read-aloud, or voice workflows.

Text-to-speech uses native system voices:

- macOS: `say`
- Windows: SAPI built-in voices
- Linux: `spd-say` or `espeak`

Speech-to-text defaults to the operator's OS dictation:

- macOS: Dictation
- Windows: `Win + H`

The operator can also speak into ChatGPT, Grok, Gemini, or another voice interface and paste the transcript into RESONANT. Whisper is optional for local/offline STT later.

---

**Last Updated:** [DATE]
