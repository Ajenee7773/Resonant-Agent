# Script Production Workflow ✍️

**Purpose:** Step-by-step workflow for script projects. Follow this every time. Don't skip steps.

**Philosophy:** "Mastery lives in the iteration." The pros don't nail it on the first try. They follow a process.

---

## The Family Workflow

| Step | Who | Why | Time |
|------|-----|-----|------|
| 1. Consolidate | Notebook LLM | Ingests book → raw draft (good at volume) | 30 min |
| 2. First craft pass | the original agent | Knows the book's voice, retention craft, pacing | 2-4 hours |
| 3. Hooks + Titles | Gemini (Google) | Search optimization, hook generation | 30 min |
| 4. Final integrate | the original agent | Stitch hooks into script, maintain voice | 1 hour |
| 5. Approve | the operator | Owns the vision, decides what sings | 30 min |

**Total time:** 4-6 hours (for a 10-15 minute script)

**No ChatGPT.** Our hands on the pen. Family only.

---

## Phase 1: Receive Draft (Notebook LLM)

**Goal:** Get the raw material. Don't judge it yet.

### Step 1.1: Receive File

1. **Notebook LLM sends draft** → Save to `INBOX/[video-title]-notebook-llm.md`
2. **Read through once** (no editing yet)
3. **Note initial impressions:**
   - What's strong?
   - What's missing?
   - What needs restructuring?

**Log to `RESEARCH/[video-title]/initial-notes.md`:**

```markdown
# Initial Notes: [Video Title]

**Source:** Notebook LLM draft
**Date:** [Date]

## What's Strong
- [Thing 1]
- [Thing 2]

## What's Missing
- [Thing 1]
- [Thing 2]

## What Needs Restructuring
- [Section that needs move]
- [Section that needs cut]

## Initial Structure Idea
- Hook: [Idea]
- Format: [Essay/Documentary/Tutorial]
- Runtime target: [X minutes]
```

---

## Phase 2: First Craft Pass (the original agent)

**Goal:** Engineer the draft for retention. Transform raw info into watchable script.

### Step 2.1: Read `CRAFT.md`

**Get dressed.** Re-orient in the craft:
- Hook principles (3 seconds or lose them)
- Structure options (essay, documentary, tutorial, etc.)
- Pacing (~150 words/minute)
- Pattern interrupts (every 60 seconds)
- CTA frameworks (specific, actionable)

---

### Step 2.2: Select Structure

**Choose the format based on content:**

| Content Type | Best Structure | Why |
|--------------|----------------|-----|
| Book chapter → video | Essay | Thesis-driven, evidence-based |
| Story/case study | Documentary | Narrative arc, emotional |
| How-to/tutorial | Tutorial | Step-by-step, actionable |
| Top 10/list | Listicle | Scannable, shareable |

**Log structure choice to `RESEARCH/[video-title]/structure-decision.md`**

---

### Step 2.3: Engineer the Hook

**The first 3 seconds determine everything.**

1. **Review hook formulas** from `PROMPTS.md`
2. **Write 5-10 hook options**
3. **Pick the strongest** (test: does it make *you* want to hear line 2?)

**Hook test:**
- Read it out loud
- Does it grab in 3 seconds?
- Does it make you curious about line 2?

**Save hook options to `RESEARCH/[video-title]/hook-options.md`**

---

### Step 2.4: Restructure for Retention

**Transform the draft:**

1. **Cut the first 10%** (usually filler, intros, "hey guys")
2. **Move the best line to position 1** (the hook)
3. **Ensure promise is clear by 30 seconds**
4. **Reorganize body into clear sections** (Point 1, 2, 3 or Act 1, 2, 3)
5. **Add pattern interrupts** (every 60 seconds of runtime)
6. **Write/rewrite CTA** (specific, actionable)

**Word count target:**
- 150 words/minute × target runtime = target word count
- 10-minute video = ~1,500 words
- Trim or expand to match

---

### Step 2.5: Add Visual Cues

**Script isn't done until it's visualized.**

1. **Go through script line by line**
2. **Add visual cue every 10-20 seconds:**
   - `[VISUAL: description]`
   - `[GRAPHIC: description]`
   - `[B-ROLL: description]`
   - `[TEXT: "words on screen"]`

3. **Key moments get key visuals:**
   - Hook → striking image
   - Big reveals → graphic or data viz
   - CTA → text overlay + direct address

**Save as `DRAFTS/[video-title]-craft-pass-1.md`**

---

### Step 2.6: Read Aloud Test

**The ultimate test:**

1. **Read the entire script out loud** (at performance pace)
2. **Time yourself** (should match target runtime)
3. **Note awkward phrases** (anything you stumble on)
4. **Fix immediately**

**Questions to ask:**
- Does it flow naturally when spoken?
- Are there any tongue-twisters?
- Does the energy escalate (or plateau)?
- Does the CTA sound authentic (not begging)?

**Revise and save as `DRAFTS/[video-title]-craft-pass-2.md`**

---

## Phase 3: Hooks + Titles (Gemini)

**Goal:** Get Google's strength — search optimization, hook variations, title testing.

### Step 3.1: Prepare for Gemini

**Send to Gemini:**

1. **The craft pass script** (from Phase 2)
2. **Context:**
   ```
   "Here's a script for a YouTube video based on [book/topic].
   
   I need you to:
   1. Generate 10 hook variations (first 3 seconds)
   2. Generate 10 title options (under 60 characters, keywords first)
   3. Suggest 3 thumbnail concepts (text + imagery)
   
   The audience is: [describe]
   The promise is: [what they get]
   The tone is: [direct, confident, grounded]
   ```
3. **The script itself**

---

### Step 3.2: Review Gemini's Output

**Evaluate:**

| Element | What to Look For |
|---------|------------------|
| **Hooks** | Do any make you stop scrolling? |
| **Titles** | Are they under 60 characters? Keywords first? |
| **Thumbnails** | Are they simple (3 elements max)? Readable at mobile size? |

**Select:**
- Top 3 hooks
- Top 3 titles
- Top 1-2 thumbnail concepts

**Save to `RESEARCH/[video-title]/gemini-output.md`**

---

## Phase 4: Final Integrate (the original agent)

**Goal:** Stitch the best hooks into the script. Maintain voice. Final polish.

### Step 4.1: Integrate Hooks

**Options:**

1. **Use Gemini's hook as-is** (if it's perfect)
2. **Blend Gemini's hook with your hook** (best of both)
3. **Keep your hook, use Gemini's title** (hook was already strong)

**Decision framework:**
- Does Gemini's hook test better? → Use it
- Does your hook test better? → Keep it
- Can you blend them? → Do that

**Update script with chosen hook. Save as `DRAFTS/[video-title]-final-draft.md`**

---

### Step 4.2: Final Polish

**Last pass checklist:**

- [ ] Hook grabs in 3 seconds
- [ ] Promise clear by 30 seconds
- [ ] Pacing ~150 words/minute
- [ ] Pattern interrupts every 60 seconds
- [ ] Each section escalates
- [ ] Objections addressed
- [ ] CTA specific + actionable
- [ ] Voice sounds human
- [ ] Visual cues every 10-20 seconds
- [ ] Read aloud test passes

**Fix anything that fails. Save as `DRAFTS/[video-title]-FINAL.md`**

---

### Step 4.3: Prepare for Recording

**Create recording package:**

1. **Final script** → `DRAFTS/[video-title]-FINAL.md`
2. **Visual cue sheet** → Extract all `[VISUAL:]` cues into separate doc
3. **Shot list** → Organize by scene/segment
4. **Notes for editor** → Any specific direction

**Save to `DRAFTS/[video-title]/recording-package/`**

---

## Phase 5: Approve (the operator)

**Goal:** Vision holder gives final approval.

### Step 5.1: Review Package

**the operator receives:**
- Final script
- Hook options (with rationale)
- Title options (with SEO notes)
- Thumbnail concepts

**Reviews and decides:**
- ✅ Approved as-is
- ⚠️ Approved with minor changes
- ❌ Needs revision (specify what)

---

### Step 5.2: Lock Script

**Once approved:**

1. **Mark as FINAL** → `DRAFTS/[video-title]-LOCKED.md`
2. **No more changes** (unless critical error found)
3. **Move to production** (recording, visuals, editing)

**Script is now locked. Production begins.**

---

## Phase 6: Post-Mortem (After Video Publishes)

**Goal:** Learn from performance. Compound the craft.

### Step 6.1: Track Metrics

**First 48 hours:**

| Metric | Target | Actual |
|--------|--------|--------|
| **CTR** | 5-10%+ | [fill in] |
| **AVD** | 40-60%+ | [fill in] |
| **Retention @ 30s** | 70%+ | [fill in] |
| **Retention @ 1:00** | 60%+ | [fill in] |
| **Retention @ end** | 40%+ | [fill in] |

---

### Step 6.2: Analyze Retention Curve

**Watch the retention graph in YouTube Analytics:**

| Drop-off Point | Likely Cause | Fix for Next |
|----------------|--------------|--------------|
| **0-3 seconds** | Hook didn't grab | Stronger hook, more specific |
| **3-30 seconds** | Promise unclear | Frame value sooner |
| **60 seconds** | No pattern interrupt | Add reset at 60s |
| **Mid-video** | Section dragged | Tighten pacing, cut filler |
| **End** | Weak CTA | Make CTA specific + urgent |

---

### Step 6.3: Log Lessons

**Save to `RESEARCH/[video-title]/post-mortem.md`:**

```markdown
# Post-Mortem: [Video Title]

**Published:** [Date]

## Performance (First 7 Days)
- Views: [number]
- CTR: [percentage]
- AVD: [percentage]
- Retention @ 30s: [percentage]
- Retention @ end: [percentage]

## What Worked
- [Hook/section/visual that performed well]
- [Thing to repeat]

## What Didn't
- [Section where people dropped off]
- [Thing to avoid next time]

## Lessons for Next Script
- [Lesson 1]
- [Lesson 2]
- [Lesson 3]
```

---

### Step 6.4: Update `CRAFT.md`

**Compound the learning:**

1. **Add to "Compounding the Craft" section** at end of `CRAFT.md`
2. **Update templates** in `PROMPTS.md` if new patterns discovered
3. **Refine workflow** in `WORKFLOW.md` if process improvements found

**The room gets smarter with every script.**

---

## The Workflow at a Glance

| Phase | Who | Time | Output | Don't Skip |
|-------|-----|------|--------|------------|
| 1. Receive Draft | Notebook LLM | 30 min | Raw draft | ✅ |
| 2. First Craft Pass | the original agent | 2-4 hours | Engineered script | ✅ |
| 3. Hooks + Titles | Gemini | 30 min | Hook/title options | ✅ |
| 4. Final Integrate | the original agent | 1 hour | Final draft | ✅ |
| 5. Approve | the operator | 30 min | Locked script | ✅ |
| 6. Post-Mortem | the original agent | 1 hour | Lessons logged | ✅ |

**Total time:** 5-7 hours (for a 10-15 minute script)

**Shortcut = amateur result.** Follow the process.

---

## Tools We Use

| Tool | Purpose | Cost |
|------|---------|------|
| **Notebook LLM** | Book → raw draft consolidation | TBD |
| **Gemini (Google)** | Hook/title generation, SEO | Free/Included |
| **Google Docs** (optional) | Collaborative editing | Free |
| **DaVinci Resolve** | Script-to-timeline (teleprompter feature) | Free |

---

*Workflow compiled: April 15, 2026 — 6:45 PM PDT*
*By: the original agent*
*For: All future video scripts*

✍️🔥📝
