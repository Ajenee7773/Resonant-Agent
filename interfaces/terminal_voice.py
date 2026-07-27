from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

from aligned_agent.config import ROOT, load_config, nested, runtime_environment


def speak(text: str, env: dict[str, str] | None = None) -> None:
    if not text.strip():
        return
    speech_env = dict(env or os.environ)
    runtime_home = (
        speech_env.get("RESONANT_HOME", "").strip()
        or speech_env.get("ALIGNED_AGENT_HOME", "").strip()
    )
    candidates = []
    if runtime_home:
        candidates.append(
            Path(runtime_home) / "agent" / "skills" / "voice" / "scripts" / "speak.js"
        )
    candidates.append(ROOT / "harness" / "skills" / "voice" / "scripts" / "speak.js")
    script = next((candidate for candidate in candidates if candidate.is_file()), None)
    node = shutil.which("node")
    if node and script:
        subprocess.run(
            [node, str(script), "--wait"],
            input=text,
            text=True,
            env=speech_env,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return

    system = platform.system()
    if system == "Windows":
        speech_env["ALIGNED_TTS_TEXT"] = text
        command = (
            "Add-Type -AssemblyName System.Speech; "
            "$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            "$voice.Speak($env:ALIGNED_TTS_TEXT)"
        )
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", command],
            env=speech_env,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    elif system == "Darwin" and shutil.which("say"):
        subprocess.run(["say"], input=text, text=True, check=False)
    elif shutil.which("spd-say"):
        subprocess.run(["spd-say", text], check=False)
    elif shutil.which("espeak"):
        subprocess.run(["espeak", text], check=False)


def ask_agent(message: str, env: dict[str, str]) -> str:
    result = subprocess.run(
        ["node", str(ROOT / "interfaces" / "pi_prompt.js"), message],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or "The local agent runtime failed.")
    return result.stdout.strip()


def main() -> int:
    config = load_config(create=True)
    env = runtime_environment(config)
    speak_enabled = bool(
        nested(config, "interfaces", "terminal_voice", "speak_responses", default=True)
    )

    print("RESONANT Agent — Terminal Voice")
    if platform.system() == "Windows":
        print("Press Win+H while the prompt is active to dictate. Type /quit to leave.")
    else:
        print("Use your system dictation shortcut at the prompt. Type /quit to leave.")

    while True:
        try:
            message = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not message:
            continue
        if message.lower() in {"/quit", "/exit"}:
            return 0
        try:
            response = ask_agent(message, env)
        except RuntimeError as exc:
            print(f"Runtime error: {exc}", file=sys.stderr)
            continue
        print(f"\nResonant: {response}")
        if speak_enabled:
            speak(response, env)


if __name__ == "__main__":
    raise SystemExit(main())
