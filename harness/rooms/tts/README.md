# TTS Room

Use this room when converting text into speech or setting up voice workflows.

## Built-In Voice

RESONANT Agent ships with a native voice skill:

```text
~/.resonant/agent/skills/voice/
```

It uses built-in system speech where possible:

- macOS: `say`
- Windows: SAPI built-in voices
- Linux: `spd-say` or `espeak`

## Speak

macOS/Linux:

```bash
~/.resonant/agent/skills/voice/scripts/speak.sh "Text to speak"
```

Windows PowerShell:

```powershell
& "$env:USERPROFILE\.resonant\agent\skills\voice\scripts\speak.ps1" "Text to speak"
```

Cross-platform:

```bash
node ~/.resonant/agent/skills/voice/scripts/speak.js "Text to speak"
```

## Stop

```bash
node ~/.resonant/agent/skills/voice/scripts/speak.js --stop
```

## Speech-To-Text

Default speech-to-text is the operator's OS dictation:

- macOS: Dictation from System Settings > Keyboard > Dictation
- Windows: `Win + H`

The local UI also exposes a mic button when the browser supports speech recognition.

For higher accuracy, the operator may use ChatGPT, Grok, Gemini, or another voice interface, then paste the transcript into RESONANT.

For local/offline STT, use an optional Whisper setup later. Keep Whisper optional because it adds model downloads and setup friction.
