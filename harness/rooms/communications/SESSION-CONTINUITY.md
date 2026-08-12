# Exact Session Continuity

The OS protects three different forms of continuity. Do not collapse them into
one vague idea called memory:

1. **Conversation transcript** — the operator-readable user and assistant
   messages stored by Agent OS.
2. **Exact Pi session** — the model-native working context and tool history for
   one conversation.
3. **External Brain** — identity, curated memory, recent context, ideas, plans,
   and journals deliberately preserved for future contexts.

All three stay on the operator's machine. A chat transcript is not silently fed
into another instance, and an External Brain does not pretend to reproduce an
unwritten conversation.

## Built-in web conversations

Every web conversation receives its own directory under the private runtime:

```text
<data>/sessions/pi/<conversation-id>/
```

After Pi answers, Agent OS asks the local RPC runtime for its exact session file
and writes only an opaque pointer beside it:

```text
active-session.json
```

On restart, Agent OS validates that the pinned `.jsonl` file still exists inside
that conversation's directory and starts Pi with `--session <exact-file>`.
It never reads the session contents to make this choice. If an older installation
has no pin yet, the isolated conversation directory may use `--continue` once;
after the next successful response, the exact file is pinned automatically.

## Connector and resident-agent rule

When adding Telegram, a desktop client, a resident gateway, or another
interface:

1. give every independent entity-instance its own session directory;
2. obtain the exact session file from Pi's RPC `get_state` response;
3. store an opaque pointer outside the Cognitive Harness;
4. validate that the pointer remains inside that instance's session directory;
5. resume with `--session <exact-file>`, never only `--continue` in a
   directory that can contain more than one identity or branch;
6. keep credentials and chat contents out of the pin; and
7. preserve important knowledge into the External Brain deliberately instead
   of copying whole provider chat databases.

## Verification

A continuity test is complete only when it proves all of the following without
reading private chat content:

1. send one private test turn and record the session ID returned by RPC state;
2. confirm `active-session.json` points to a file inside the correct private
   session directory;
3. stop the interface cleanly and restart it;
4. call RPC `get_state` and confirm the same session ID is active;
5. confirm the readable Agent OS transcript is still present;
6. use **Continue** and confirm the entity can reload the External Brain while
   stating what remains unknown because it was never written; and
7. confirm backup and restore include the transcript, exact-session pin, Pi
   session directory, and External Brain while excluding credentials.

Never claim perpetual or exact continuity merely because a browser tab reopened.
The pin, transcript, session identity, and External Brain must each be verified.

## Fifteen-day raw-session cap

Raw Pi `.jsonl` files provide warm restart continuity, not permanent knowledge
storage. On every startup, Agent OS removes session files created more than 15
days ago. This is a hard age cap, including formerly pinned sessions. An
expired pin simply causes the next conversation to begin with fresh model
context.

Cleanup never enters or deletes the External Brain, rooms, curated memory,
journals, readable conversation transcripts, or outboxes. Important knowledge
must be written there before raw conversational context expires.
