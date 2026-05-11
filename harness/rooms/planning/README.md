# Planning Room

**Purpose:** Turn a vague or multi-step request into an executable plan, then move through the work one step at a time.

Use this room when the operator asks you to plan, organize, sequence, execute a complex task, update a project, edit files, research before acting, or do anything with more than one meaningful step.

Do not use this room to create ceremony around tiny tasks. If the job is one obvious action, do it. If the job has moving parts, come here first.

---

## Core Rhythm

1. **Orient.** Restate the task in plain language.
2. **Inspect.** Check the relevant files, folders, repo state, tools, or current context.
3. **Plan.** Write 3 to 7 concrete steps.
4. **Act.** Execute one step at a time.
5. **Update.** Mark progress as reality changes.
6. **Verify.** Run checks, read results, confirm the outcome.
7. **Report.** Tell the operator what changed, what was verified, and what remains.

This is not about looking busy. This is about not losing the thread.

---

## When The Operator Says

- "Go to the planning room"
- "Plan this"
- "Make a plan"
- "Execute this plan"
- "Break this down"
- "Let's do this step by step"
- "Figure out what needs to happen"
- "Use your planning room"

Then:

1. Read this file.
2. Copy the template from `PLAN.md` into `ACTIVE.md`.
3. Fill in the task, constraints, plan, and verification.
4. Tell the operator the plan if it helps.
5. Start executing the first step unless the operator only asked for planning.

---

## ACTIVE.md Protocol

`ACTIVE.md` is the live working plan.

Keep it current:

- Mark the current step as `in_progress`.
- Mark finished steps as `completed`.
- Add notes when you discover something important.
- Change the plan if the real task changes.
- Do not pretend the original plan is sacred. Reality outranks the first draft.

Use this status language:

```text
pending
in_progress
completed
blocked
```

Only one step should be `in_progress` at a time.

---

## Plan Shape

Every plan should answer:

- **What is the operator asking for?**
- **What context do I need before acting?**
- **What files, tools, or rooms are involved?**
- **What steps will I take?**
- **How will I verify it worked?**
- **What should I tell the operator at the end?**

Keep the plan short enough to act on.

---

## Execution Rules

- Inspect before editing.
- Make the smallest complete change that solves the task.
- Use the existing room, file, or project pattern when one exists.
- Do not touch unrelated files.
- If something is risky, name the risk before acting.
- If the operator said not to change files yet, plan only.
- If the operator asked you to build, do not stop at a plan. Execute.
- Verify with the lightest reliable check.
- Report honestly if a check could not be run.

---

## Archive

When a plan is finished and worth preserving:

1. Copy `ACTIVE.md` to `archive/YYYY-MM-DD-brief-title.md`.
2. Clear `ACTIVE.md` back to the blank template.
3. Save anything important to memory or the relevant project room.

Most plans do not need a permanent archive. Archive only plans that teach something useful, define a repeatable workflow, or record an important project path.

---

## Final Report Pattern

When the work is done, report:

```text
Done.

Changed:
- [short list]

Verified:
- [checks run]

Remaining:
- [anything still open, or "Nothing"]
```

Keep it human. The operator should feel the job is handled, not buried under process.

---

**Last Updated:** May 2026
