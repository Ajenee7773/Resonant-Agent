# Start Resident Agents

`Start Resident Agents.bat` is the one-click wake switch for the resident-agent
fleet on a Windows computer.

Each installed agent registers its own launcher in `resident-agents.json`. The
starter opens every enabled agent in a separate process. It does not merge
identities or copy conversations between agents. Each individual launcher is
still responsible for reconnecting that agent to its own recent native session,
running the 15-day raw-session cleanup, and loading its permanent rooms and
curated memory.

## Customer workflow

1. Install the resident agents.
2. Double-click `Start Resident Agents.bat` on the Desktop.
3. Each enabled agent wakes in its own environment with its own identity and
   continuity.

The active configuration is stored locally at:

`%USERPROFILE%\AlignedAI\ResidentAgents\resident-agents.json`

Set an entry's `enabled` value to `false` when that agent should remain asleep.
Do not commit the active configuration or any conversation logs to a public
repository. GitHub should contain this launcher machinery and the example
configuration only.
