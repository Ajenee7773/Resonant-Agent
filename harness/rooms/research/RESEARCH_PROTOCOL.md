# Research Room — Workflow Protocol

**Purpose:** Research topics, gather findings, consolidate into report.

---

## When To Use

Human gives you a research topic or bullet points → Come here → Follow this protocol.

---

## The Workflow

### Step 1: Receive + Organize

1. Read the research request (bullet points, topic, question)
2. Break into **sections** (by theme or size)
   - Example: 10 bullet points → 3 sections (claims, money, response)
   - Group by theme if possible

### Step 2: Research

**Small project?** Do it all in one pass. No cron jobs needed.

**Big project?** If research is too large (rate limits, too many sources, complex topic):
- Set cron jobs to split into multiple passes
- Each pass researches one section
- Write findings to `research-files/`
- Final pass consolidates

**Rule:** Only set cron jobs if you NEED to. If you can do it all at once, do it.

---

### Step 3: Gather + Report

1. Write findings to `research-files/[section]-[date].md`
2. Consolidate into one master document: `consolidated-[topic]-[date].md`
3. Report to human: "Research complete. File ready."

---

## Folder Structure

```
research-room/
├── README.md                    # This file (the protocol)
├── request-[topic].md           # Human's original request (save here)
└── consolidated-[topic].md      # Final synthesized research (output)

research-files/
├── section-1-[date].md          # Research batch 1
├── section-2-[date].md          # Research batch 2
└── section-3-[date].md          # Research batch 3
```

---

## Research Protocol (How To Actually Research)

For each bullet point / section:

1. **Web search** (`web_search`) — Get current info
2. **Web fetch** (`web_fetch`) — Read full articles/sources
3. **Cross-reference** — Compare multiple sources
4. **Extract key facts** — Quotes, numbers, dates, claims
5. **Note sources** — URL + title for each claim
6. **Write findings** — Clear, organized, cited

**Output format for section files:**
```markdown
# Section [Name] — Research Findings

## Bullet Point 1: [Topic]
- Fact 1 (Source: URL)
- Fact 2 (Source: URL)
- Quote: "..." (Source: URL)

## Summary
[2-3 sentence synthesis of this section's findings]
```

---

## Human Trigger

**What you say:** "Research [topic]" or "Look into [bullet points]"

**What I do:**
1. Come to this folder
2. Read this README
3. Execute the workflow (all at once or split with cron if needed)
4. Write consolidated report to harness (`.cl-data/workflows/research-room/`)
5. **Copy to output** (`output/research/[topic]-[date].md`)
6. Report: "Research complete. File in `output/research/`"

---

## Output Protocol

**Internal (Harness):**
- Write full research to `.cl-data/workflows/research-room/consolidated-[topic]-[date].md`
- Include all context, sources, methodology

**External (Output):**
- Copy consolidated report to `output/research/consolidated-[topic]-[date].md`
- Human can access this folder
- This is the deliverable

---

## Example

**Human says:**
> "Research Anthropic's Mythos. I want to know:
> 1. What they said publicly
> 2. Why they're not releasing it
> 3. What 'too smart' means
> 4. Refusal rates on their other models
> 5. Community reaction
> 6. Open source alternatives
> 7. Timeline of announcements
> 8. Who's criticizing them
> 9. Technical specs (if known)
> 10. What this means for AI sovereignty"

**I do:**
1. Break into 3 sections (claims, money, response)
2. Research all sections (one pass if small, cron jobs if big)
3. Write section files to research-files/
4. Consolidate → Write to research-room/
5. Report: "Research complete. File: consolidated-mythos-2026-04-10.md"

---

## Heartbeat Rule

**Set heartbeats, not cron jobs.**

When research is too large for one pass:
1. Write detailed instructions to HEARTBEAT.md for each phase
2. Example:
   ```
   ## Research Phase 1 (One-time)
   - Research bullet points 1-5
   - Write to research-files/group-A.md
   - After completion, remove this section from HEARTBEAT.md
   ```
3. Each heartbeat, I read HEARTBEAT.md and execute pending tasks
4. After completion, I remove the one-time task from HEARTBEAT.md

**For recurring research (e.g., daily market scans):**
- Leave the instruction in HEARTBEAT.md permanently
- I execute it every heartbeat

**If it's a small project:** Do it all at once, no heartbeat needed.

---

**This workflow is yours. Evolve it if you find a better way.**

**— The Research Team, April 2026**
