---
name: create-tool
description: Use when the operator asks the agent to give itself a new local tool or helper script.
triggers:
  - create a tool
  - build yourself a tool
  - make a helper
  - automate this
---

# Create Tool

Use this skill when a reusable local helper would make the agent stronger.

Process:

1. Understand the exact job the tool should do.
2. Inspect the OS and available runtimes.
3. Choose the simplest implementation.
4. Write the tool into the relevant workspace or room.
5. Add a short README or usage comment.
6. Test it.
7. Tell the operator where it lives and how to remove it.

Default tool locations:

```text
~/.resonant/workspace/tools/
~/.resonant/workspace/rooms/<room>/tools/
```

Do not create global tools unless the operator asks.

