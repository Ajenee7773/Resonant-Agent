# RESONANT Agent Telegram

Telegram support is built in, but dormant until the operator connects a bot token.

## Setup

1. Open Telegram.
2. Search for `@BotFather`.
3. Start a chat with the official verified BotFather account.
4. Send `/newbot`.
5. Choose a display name, such as `My Resonant Agent`.
6. Choose a username ending in `bot`, such as `my_resonant_agent_bot`.
7. Copy the bot token BotFather gives you.
8. Run:

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

Keep the token private. Anyone with the token can control that Telegram bot.

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
