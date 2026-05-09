# RESONANT Agent Release Checklist

Use this before pushing a public release.

## Required

- Replace `Ajenee7773/Resonant-Agent` in installer docs/scripts with the final GitHub repo if the repo moves.
- Confirm the MIT copyright holder line is correct.
- Run a clean install in a disposable user/home directory.
- Verify `install.sh`, `install.ps1`, `start.sh`, `start.ps1`, and `start.bat`.
- Verify remote one-line install leaves usable launchers in `~/.resonant/app` and `~/.resonant/bin`.
- Verify an existing global `pi` runtime is reused instead of overwritten.
- Verify RESONANT Agent starts through the launcher and reads the installed harness.
- Verify first boot finds `BOOT.md`, core harness files, persona files, and rooms.
- Verify `configure` writes Pi-native `settings.json`, `models.json`, and `auth.json`.
- Verify Ollama path with a local model.
- Verify one cloud provider path with an API key.
- Verify local UI binds only to `127.0.0.1`.
- Verify the local UI starts and shows Mic/Voice controls without breaking chat.
- Verify the native voice skill installs to `~/.resonant/agent/skills/voice/`.
- Verify text-to-speech on at least one macOS machine and one Windows machine.
- Verify Telegram setup with a throwaway bot token.
- Verify Telegram bridge can be stopped with Ctrl+C.

## Do Not Release If

- Any installer reaches into a live personal harness outside the repo.
- Any UI binds to `0.0.0.0` by default.
- Any API token is exposed to browser JavaScript.
- Any setup path requires a public tunnel.
- The harness is missing root identity files.

## Nice To Have

- App icon/logo.
- Screenshots/GIFs for README.
- Signed Windows/macOS desktop wrapper later.
- GitHub Actions checks for Node syntax.
