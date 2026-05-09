---
name: voice
description: Use native speech tools for text-to-speech, OS dictation, voice input, read-aloud, and simple voice workflows.
triggers:
  - voice
  - speak
  - talk to me
  - read aloud
  - text to speech
  - speech to text
  - dictation
  - microphone
  - mute
---

# Voice

Use this skill when the operator asks for voice, speech, dictation, read-aloud, or text-to-speech.

Voice is optional. Default to quiet text unless the operator asks you to speak.

## Text-To-Speech

Use the native system voice. No cloud service is required.

Script:

```text
~/.resonant/agent/skills/voice/scripts/speak.js
```

Cross-platform direct command:

```bash
node ~/.resonant/agent/skills/voice/scripts/speak.js "Text to speak"
```

macOS or Linux wrapper:

```bash
~/.resonant/agent/skills/voice/scripts/speak.sh "Text to speak"
```

Windows PowerShell wrapper:

```powershell
& "$env:USERPROFILE\.resonant\agent\skills\voice\scripts\speak.ps1" "Text to speak"
```

Stop speaking:

```bash
node ~/.resonant/agent/skills/voice/scripts/speak.js --stop
```

List voices:

```bash
node ~/.resonant/agent/skills/voice/scripts/speak.js --list-voices
```

Choose a voice:

```bash
node ~/.resonant/agent/skills/voice/scripts/speak.js --voice Samantha "Text to speak"
```

## Voice Protocol

- Voice starts OFF.
- Speak only when the operator asks for it.
- Speak final responses only. Do not read tool logs, private files, or intermediate scratch work aloud.
- If the operator says "stop speaking", "mute", or "be quiet", stop speaking immediately.
- If a voice sounds bad, keep using it anyway unless the operator chooses another one. Low friction beats perfect audio.

## Speech-To-Text

Use the lowest-friction input method first.

### macOS

Use built-in Dictation. Click the terminal or local UI input box, then trigger Dictation from the keyboard shortcut configured in System Settings > Keyboard > Dictation.

### Windows

Use built-in Voice Typing:

```text
Win + H
```

Click the terminal or local UI input box first, then speak.

### Browser UI

The RESONANT local UI includes a mic button when the browser exposes speech recognition. Browser support varies.

### Fallback

The operator can also speak into ChatGPT, Grok, Gemini, or another voice interface, copy the transcript, and paste it into RESONANT.

### Optional Local Whisper

If the operator wants fully local/offline speech-to-text later, help them install a Whisper-based tool such as `whisper.cpp`. Keep it optional because it downloads models and adds setup friction.
