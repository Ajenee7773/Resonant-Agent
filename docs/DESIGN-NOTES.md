# RESONANT Agent Design Notes

## AGENTS.md Template

Use plain token placeholders:

```text
{{OPERATOR_NAME}}
{{AGENT_NAME}}
{{MISSION}}
```

Reasons:

- easy to understand,
- easy to replace with shell, PowerShell, Node, or the agent itself,
- easy for users to edit manually,
- no schema or templating engine required.

The template should stay generic. Private alignment belongs in the user's own installed harness or in a release-specific harness folder that the user intentionally provides.

## Localhost UI

For Phase 2, use the lightest thing that works:

1. Vanilla HTML/CSS/JS if Pi can expose a simple local process/API.
2. Preact or Vue if component state becomes annoying.
3. React only if the ecosystem advantage matters.

Recommendation: start with vanilla JS plus a tiny server adapter. A chat window does not need a full frontend stack until the product asks for it.

## Telegram

Telegram should be an optional adapter, not a mandatory core path.

Reason:

- it needs a bot token,
- it talks to the network,
- it has long-polling/webhook behavior,
- it creates a new message channel,
- not every user wants it.

The simple shape:

```text
telegram extension
  - reads TELEGRAM_BOT_TOKEN from an owner-provided file/env var
  - polls getUpdates or receives webhook
  - maps Telegram chat messages into Pi prompts
  - sends Pi responses back through sendMessage
```

Start with long polling. Webhooks can come later.

## TypeScript Extensions

Pi extensions should live in:

```text
harness/extensions/
```

The installer copies them to:

```text
~/.resonant/agent/extensions/
```

Packaging rule:

> Do not reach into a user's live `~/.resonant/agent/extensions` directory during packaging.

Instead, copy sanitized release extension files into this repo before building a release.

Potential issue:

The extension files must compile against the installed `@mariozechner/pi-coding-agent` version. Keep the package version pinned in `install.sh` and `install.bat` until the extension API is intentionally upgraded.

Current pin:

```text
@mariozechner/pi-coding-agent@0.69.0
```

## What Belongs in Core

Core should stay small:

- install,
- configure,
- AGENTS template,
- boot protocol,
- rooms,
- skills,
- extension drop-in path.

Anything the agent can create itself should be a skill, recipe, or optional extension.
