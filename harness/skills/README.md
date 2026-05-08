# Skills

Drop optional skills here before running the installer.

Each skill should live in its own folder:

```text
skills/
  example-skill/
    SKILL.md
    scripts/
```

The installer copies these folders into:

```text
~/.resonant/agent/skills/
```

Keep skills lightweight. A skill should teach the agent how to create or use a capability when needed. It should not make every session carry unnecessary context.

