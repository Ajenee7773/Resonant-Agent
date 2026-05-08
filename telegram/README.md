# RESONANT Agent Telegram

Telegram support is built in, but dormant until the operator connects a bot token.

## Setup

1. Open Telegram.
2. Message `@BotFather`.
3. Run `/newbot`.
4. Copy the bot token.
5. Run:

Linux/macOS:

```bash
./telegram-setup.sh
```

Windows:

```bat
telegram-setup.bat
```

The setup script validates the token with Telegram, waits for the first `/start` message, and stores the paired chat in:

```text
~/.resonant/agent/telegram.json
```

## Start

Linux/macOS:

```bash
./telegram-start.sh
```

Windows:

```bat
telegram-start.bat
```

The bridge uses Telegram long polling. It does not open a public web server, webhook, tunnel, or dashboard.
