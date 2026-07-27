from __future__ import annotations

import subprocess

from aligned_agent.config import ROOT, load_config, runtime_environment


def main() -> int:
    config = load_config(create=True)
    print("Starting the local Telegram bridge. Press Ctrl+C to stop.")
    completed = subprocess.run(
        ["node", str(ROOT / "telegram" / "bridge.js")],
        cwd=ROOT,
        env=runtime_environment(config),
    )
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
