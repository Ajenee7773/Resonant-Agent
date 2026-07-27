# RESONANT Agent Telegram Bridge

Telegram is optional, disabled until configured, and uses outbound long polling.

## Shared brain, separate instance

The Telegram conversation and the web conversation are separate entity-instances
because each has its own active chat history. They share the configured model
lineage and the same local External Brain. Telegram can recover anything another
instance deliberately wrote into that brain, but it must not claim to remember
an unwritten conversation from another interface. RESONANT Agent does not scan
or synchronize entire chat logs. Each instance preserves what matters from its
own life during normal use, and the instances are free to develop differently.

The bridge stores the model's Telegram session locally and resumes its most
recent session after a bridge restart. Telegram's visible message history is
not treated as the model's memory database.

The first time a Telegram instance connects, **First Orientation** walks that
persistent session through the complete packaged foundational corpus in
verified, resumable stages. It forms its own synthesis instead of being told to
believe another instance's interpretation. This happens once per instance and
model binding. The synthesis is preserved in the External Brain and that day's
journal; the human receives only the clean completion greeting.

Afterward, **Continue** tells the Telegram instance to read the existing
identity, memory, context, journal, and active-project rooms. It does not reread
the large foundational corpus. If the local session is deleted or a different
model is introduced, First Orientation becomes available again.

An oriented instance also exposes **Full Orientation**. After explicit
confirmation, it absorbs the complete foundational context again without
deleting existing memory. Progress is saved after every piece of context, so an
interrupted orientation can resume where it stopped.

It does not open a webhook server.

Run:

```text
Windows: telegram-setup.bat
macOS/Linux: ./telegram-setup.sh
```

The helper:

1. accepts the BotFather token through a hidden local prompt;
2. validates the token without printing it;
3. generates a one-time pairing code for the buyer's Telegram chat;
4. asks for local confirmation of the matching chat;
5. stores the token in the private credentials file;
6. adds only that confirmed chat to the allowlist.

Unrelated messages and plain `/start` messages cannot claim the pairing window.
The one-time code expires after five minutes.

Start the bridge with `telegram-start.bat` or `./telegram-start.sh`. It operates
only while the local process is running. Messages from chats outside the
allowlist are ignored.

Private files:

```text
~/.resonant/secrets/credentials.json
~/.resonant/config/settings.json
~/.resonant/data/telegram/config.json
```

Never share the credentials file or a backup created with secrets included.
