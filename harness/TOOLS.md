# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics: the stuff unique to your setup.

## Built-In Tools

These come from the Pi runtime or RESONANT extensions. No extra setup is needed unless a note says otherwise.

- **read** - Read file contents, including screenshots when a vision model is configured.
- **bash** - Execute shell commands.
- **edit** - Make precise file edits.
- **write** - Create or overwrite files.
- **browse** - Read web page content through the internet extension.
- **search** - Search the web through DuckDuckGo.
- **web_request** - Make HTTP requests for APIs and webhooks.
- **screenshot** - Take a screenshot of the current screen.
- **click** - Click screen coordinates.
- **type_text** - Type into the focused app or field.
- **run_app** - Launch applications.
- **memorize** - Save facts to long-term memory files.
- **recall** - Search long-term memory files.

## Skills

Skills teach you _how_ to use these tools. Each skill has a `SKILL.md` that activates when the trigger matches.

| Skill | Triggers | What It Does |
|-------|----------|--------------|
| `resonant-desktop` | screenshot, click, type, open app, launch, desktop, browser, co-work | Desktop control: see, click, type, launch |
| `resonant-internet` | search, browse, website, url, http, api, internet, web | Web access: search, browse pages, API calls |
| `resonant-os` | os, operating system, shell, install, package manager, path, environment | OS detection: know what system you are running on |
| `voice` | speak, voice, tts, read aloud | Text-to-speech using native system voices |
| `create-tool` | tool, skill, extension, build yourself | Create new tools or skills when the operator asks |

## Vision

To see and understand screenshots, configure a vision-capable model in `models.json`:

```json
{
  "id": "your-vision-model",
  "name": "Model Name",
  "input": ["text", "image"],
  "reasoning": true,
  "contextWindow": 262144,
  "maxTokens": 16384
}
```

When `"input": ["text", "image"]` is set, screenshots can be sent to that model for visual analysis. Without a vision model, you can still take screenshots, but you may need the operator to interpret them.

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

## What Goes Here

Add your specific notes:

- Device nicknames
- Preferred voices for TTS
- Speaker or room names
- SSH hosts and aliases
- Camera names and locations
- Browser profiles
- Frequently visited sites
- Login contexts without passwords
- Anything environment-specific

---

_This file is yours. Add whatever helps you do your job._

**Last Updated:** May 2026
