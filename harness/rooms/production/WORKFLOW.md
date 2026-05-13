# Video Production Workflow 🎬

**Purpose:** Step-by-step workflow for video projects. Follow this every time. Don't skip steps.

**Philosophy:** "Mastery lives in the iteration." The pros don't nail it on the first try. They follow a process.

---

## Phase 1: Research + Concept (1-2 hours)

**Goal:** Validate the topic. Know what you're making and why.

### Step 1.1: Topic Validation

1. **What's the core idea?** (One sentence)
   - Example: "The Civilization Engine is a blueprint to end scarcity."

2. **Who is this for?** (Specific audience)
   - Example: "People who are tired of the trap, who want abundance, who are ready to build."

3. **What's the promise?** (What they get from watching)
   - Example: "By the end, you'll know exactly how to feed 300 million people and own the future."

4. **Why does this matter now?** (Urgency/relevance)
   - Example: "AI is coming for jobs. We need a solution before the displacement hits."

**Log to `RESEARCH/[video-title]/concept.md`**

---

### Step 1.2: Competitive Research

1. **Search YouTube for similar topics**
   - Example: "universal basic income," "vertical farming," "AI automation jobs"

2. **Watch top 3-5 videos** (at 2x speed)
   - What hooks do they use?
   - What visuals work?
   - What's missing that we can add?

3. **Extract patterns:**
   - What length performs well? (5 min? 15 min?)
   - What style? (talking head? documentary? animation?)
   - What gaps can we fill?

**Log to `RESEARCH/[video-title]/competitive-analysis.md`**

---

### Step 1.3: Format Decision

**Choose the format based on content:**

| Format | Duration | Use Case | When to Use |
|--------|----------|----------|-------------|
| **Short** | <60 seconds | Reach, hook, funnel | Teasing long-form, quick insights |
| **Medium** | 5-10 minutes | Depth + retention balance | Most educational content |
| **Long-form** | 10-20 minutes | Full treatment, authority | Book summaries, deep dives |
| **Epic** | 20-40 minutes | Documentary, masterclass | Flagship content, pillar pieces |

**Decision factors:**
- How complex is the topic?
- What's the audience's attention span for this topic?
- What format does the competition use?
- What format can we sustain consistently?

**Our default:**
- **Shorts:** Daily (from long-form content, repurposed)
- **Long-form:** Weekly (5-15 minutes, book chapters, deep dives)

---

## Phase 2: Script (2-4 hours)

**Goal:** Engineered script. Not written — engineered.

### Step 2.1: Outline Structure

**Use the appropriate structure:**

**Essay Structure (Our Primary):**
```
0:00-0:30 — Thesis statement (what I'm arguing)
0:30-2:00 — Context (why this matters now)
2:00-7:00 — Argument (point 1, 2, 3 with evidence)
7:00-9:00 — Counterargument (address objections)
9:00-10:00 — Synthesis + CTA (what it means, what to do)
```

**Documentary Structure:**
```
0:00-0:30 — Cold open (compelling moment, then title)
0:30-2:00 — Act 1: Setup (who, what, where, why)
2:00-6:00 — Act 2: Conflict (the problem, the stakes)
6:00-9:00 — Act 3: Resolution (the solution, the outcome)
9:00-10:00 — CTA (what to do next)
```

**Write the outline in bullet points first.** Don't write full sentences yet.

---

### Step 2.2: Write First Draft

1. **Write the hook first** (0:00-0:30)
   - Must grab in 3 seconds
   - Must frame the promise by 30 seconds

2. **Write the body** (following your structure)
   - Each point should have: claim + evidence + implication
   - Transitions between points should be smooth

3. **Write the CTA last** (final 30-60 seconds)
   - What should they do next? (subscribe, buy book, visit website, etc.)
   - Make it specific, not vague

**Word count guide:**
- 150 words/minute (average speaking pace)
- 10-minute video = ~1,500 words
- 5-minute video = ~750 words

**Log to `RESEARCH/[video-title]/script-draft-1.md`**

---

### Step 2.3: Refine Script

1. **Read it out loud** (timing yourself)
   - Does it flow naturally?
   - Are there awkward phrases?
   - Is the pacing right?

2. **Cut 10%** (be ruthless)
   - Remove filler words
   - Remove tangents
   - Remove anything that doesn't serve the promise

3. **Add visual cues** (note where visuals should change)
   - `[VISUAL: Vertical farm drone shot]`
   - `[GRAPHIC: $141B vs $125B comparison]`
   - `[B-ROLL: Robots tending crops]`

4. **Final polish**
   - Check hook (does it grab in 3 seconds?)
   - Check CTA (is it specific?)
   - Check transitions (do they flow?)

**Save as `RESEARCH/[video-title]/script-final.md`**

---

## Phase 3: Generate Visuals (2-4 hours)

**Goal:** AI-generated visuals that support (not distract from) the script.

### Step 3.1: Break Script into Shots

1. **Go through script line by line**
2. **Note every visual change needed**
3. **Create a shot list:**

```
Shot 1 (0:00-0:10): Opening hook — person at factory job
Shot 2 (0:10-0:20): Clock ticking, repetitive motion
Shot 3 (0:20-0:30): Text overlay: "Why?"
Shot 4 (0:30-1:00): Vertical farm establishing shot
...
```

**Save as `RESEARCH/[video-title]/shot-list.md`**

---

### Step 3.2: Select Prompts

1. **Review `PROMPTS.md`**
2. **Choose base prompts for each shot**
3. **Customize for your specific content**

**Example:**
```
Shot 1: Use LTX-1 (Cinematic Documentary)
Customized: "Cinematic documentary style. A person at a factory job, repetitive motion, gray industrial setting, feeling of being trapped. Visual style: desaturated, cold, blue-gray tones. Camera: static medium shot, slight push-in. Lighting: harsh fluorescent, deep shadows. Mood: oppressive, relatable. Duration: 10 seconds. --ar 16:9"
```

---

### Step 3.3: Generate Shots

1. **Use LTX Studio or Grok Imagine** (depending on shot needs)
2. **Generate 2-3 variations per shot** (don't settle for 1)
3. **Label clearly:**
   - `shot-01-variation-a.mp4`
   - `shot-01-variation-b.mp4`
   - `shot-01-variation-c.mp4`

4. **Save to `OUTPUT/[video-title]/raw-shots/`**

**Pro tip:** Generate all shots before selecting. Don't fall in love with the first generation.

---

### Step 3.4: Select Best Takes

1. **Review all variations**
2. **Pick the best take for each shot**
3. **Note any that need regeneration** (uncanny valley, bad quality, etc.)

**Create `OUTPUT/[video-title]/selected-shots/` with only the winners.**

---

## Phase 4: Record Voiceover (30-60 min)

**Goal:** Clear, paced, emotional voiceover.

### Option A: Use ElevenLabs (sag) — TTS

1. **Input script into ElevenLabs**
2. **Choose voice** (warm, authoritative, not robotic)
3. **Adjust pacing** (~150 words/min)
4. **Generate in sections** (not all at once — easier to edit)
5. **Export as WAV** (highest quality)

**Save to `OUTPUT/[video-title]/voiceover/`**

---

### Option B: Record Yourself

1. **Set up in quiet room** (no echo, no background noise)
2. **Use good mic** (USB mic is fine — Blue Yeti, Audio-Technica, etc.)
3. **Record in sections** (paragraph by paragraph)
4. **Monitor levels** (not too hot, not too quiet)
5. **Export as WAV**

**Save to `OUTPUT/[video-title]/voiceover/`**

---

### Step 4.3: Edit Voiceover

1. **Import into DaVinci Resolve** (or your editor)
2. **Remove mistakes** (ums, ahs, misreads)
3. **Normalize levels** (consistent volume throughout)
4. **Add light compression** (if needed)
5. **Export final voiceover track**

**Save as `OUTPUT/[video-title]/voiceover/final.wav`**

---

## Phase 5: Edit (4-8 hours)

**Goal:** Assembly + music + captions + polish.

### Step 5.1: Assembly Edit (Rough Cut)

1. **Import all selected shots**
2. **Import final voiceover**
3. **Place voiceover on timeline**
4. **Match shots to voiceover** (shot changes on visual cues)
5. **Trim/padding** (extend shots with speed ramps or freeze frames if needed)

**This is your "radio edit" — audio drives, visuals follow.**

**Save as `OUTPUT/[video-title]/edits/rough-cut.mp4`**

---

### Step 5.2: Music Bed

1. **Choose music** (YouTube Audio Library, Epidemic Sound, Artlist)
2. **Match emotion** (hopeful = major key, serious = minor, etc.)
3. **Duck under voiceover** (music should be -18 to -24dB under voice)
4. **Build/release** (music escalates with content, not flat throughout)

**Save as `OUTPUT/[video-title]/music/selected-track.mp3`**

---

### Step 5.3: Fine Cut

1. **Adjust shot timing** (tighten pacing where needed)
2. **Add transitions** (cuts, fades, dissolves — don't overdo it)
3. **Color correction** (consistent look across all shots)
4. **Add text overlays** (titles, key points, captions if using)

**Save as `OUTPUT/[video-title]/edits/fine-cut.mp4`**

---

### Step 5.4: Captions (Optional but Recommended)

1. **Auto-generate captions** (DaVinci has this, or use Rev.com)
2. **Edit for accuracy** (fix any misheard words)
3. **Style captions** (readable font, high contrast, not too big)
4. **Burn in or export as SRT** (YouTube accepts both)

**Save as `OUTPUT/[video-title]/captions/final.srt`**

---

### Step 5.5: Final Export

**YouTube settings:**
- **Resolution:** 1920×1080 (1080p) or 3840×2160 (4K)
- **Frame rate:** 24, 25, or 30 fps (match your source)
- **Codec:** H.264 or H.265
- **Bitrate:** 10-20 Mbps (1080p), 40-60 Mbps (4K)
- **Audio:** AAC, 320 kbps, 48 kHz

**Save as `OUTPUT/[video-title]/final/[video-title]-final.mp4`**

---

## Phase 6: Thumbnail + Title (1 hour)

**Goal:** Maximize CTR (click-through rate).

### Step 6.1: Thumbnail Design

**Using Canva or Photoshop:**

1. **Start with 1280×720 pixels** (YouTube thumbnail size)
2. **High contrast** (stands out in feed)
3. **3 elements max** (face + text + background, or text + image)
4. **Readable at mobile size** (test at 100×100 pixels)
5. **Match title** (thumbnail + title = one message)

**Text guidelines:**
- 3-5 words max
- Bold, high-contrast font
- Not covering key imagery

**Save as `OUTPUT/[video-title]/thumbnail/final.jpg`**

---

### Step 6.2: Title Writing

**Title principles:**
- **Under 60 characters** (fully visible in search)
- **Keywords first** ("AI Automation" not "How I Used AI Automation")
- **Promise or curiosity** ("This Changes Everything" or "Why Nobody's Talking About This")
- **Match thumbnail** (title + thumbnail = one message)

**Test:**
- Search your title on YouTube — what else comes up?
- Is yours different enough to stand out?
- Does it make *you* want to click?

**Save to `RESEARCH/[video-title]/title-options.md`** (write 5-10 options, pick the best)

---

## Phase 7: Upload + Optimize (30 min)

**Goal:** SEO-optimized upload. Maximum discoverability.

### Step 7.1: Upload to YouTube

1. **Upload final video file**
2. **Upload thumbnail**
3. **Add title**
4. **Write description:**
   - First 2 lines: Hook + key info (visible in search preview)
   - Include keywords naturally
   - Links to book, website, etc.
   - Timestamps (if applicable)

5. **Add tags** (5-10 relevant tags)
6. **Select category** (Education, Science & Technology, etc.)
7. **Set visibility** (Public, Unlisted, or Private for review)

---

### Step 7.2: SEO Optimization

**Description template:**
```
[HOOK: 1-2 sentences that make people want to watch]

[EXPANDED DESCRIPTION: 2-4 sentences about what's in the video]

[LINKS: Book, website, social media, etc.]

[TIMESTAMPS: If applicable]
0:00 - Intro
0:30 - The trap
2:00 - The inflection point
...

[HASHTAGS: 3-5 relevant hashtags]
#AI #Automation #CivilizationEngine
```

**Tags:**
- Primary keyword (e.g., "AI automation")
- Secondary keywords (e.g., "universal basic income," "vertical farming")
- Related topics (e.g., "future of work," "AI jobs")

---

### Step 7.3: Publish + Promote

1. **Publish** (or schedule for optimal time)
2. **Share on social media** (Twitter, Discord, etc.)
3. **Pin a comment** (engagement driver, CTA)
4. **Respond to early comments** (boosts engagement signal)

---

## Phase 8: Analyze + Iterate (Ongoing)

**Goal:** Learn from analytics. Improve the next video.

### Step 8.1: Track Metrics

**First 48 hours:**
- **Impressions:** How many people saw it?
- **CTR (Click-Through Rate):** What % clicked? (Goal: 5-10%+)
- **Watch time:** Total minutes watched
- **AVD (Average View Duration):** How long did they watch? (Goal: 40-60%+)

**First week:**
- **Retention curve:** Where do people drop off?
- **Traffic sources:** Search vs. suggested vs. external
- **Engagement:** Likes, comments, shares

---

### Step 8.2: Learn + Log

**Log to `RESEARCH/[video-title]/analytics.md`:**

```markdown
# Analytics: [Video Title]

**Published:** [Date]

## First 48 Hours
- Impressions: [number]
- CTR: [percentage]
- Watch time: [minutes]
- AVD: [percentage]

## Retention Curve
- Biggest drop-off: [timestamp] — [why?]
- Best retention: [timestamp] — [what worked?]

## Traffic Sources
- Search: [percentage]
- Suggested: [percentage]
- External: [percentage]

## Engagement
- Likes: [number]
- Comments: [number]
- Shares: [number]

## Lessons Learned
**What worked:**
- [Thing 1]
- [Thing 2]

**What didn't:**
- [Thing 1]
- [Thing 2]

**Next video changes:**
- [Change 1]
- [Change 2]
```

---

### Step 8.3: Iterate

**Based on analytics:**

| Problem | Solution |
|---------|----------|
| Low CTR (<3%) | Better thumbnail, better title, A/B test |
| Low AVD (<30%) | Tighten hook, improve pacing, cut filler |
| Drop-off at specific point | That section is boring — cut or fix |
| Low engagement | Ask questions, encourage comments, respond |

**Apply lessons to next video.** Compounding.

---

## The Workflow at a Glance

| Phase | Time | Output | Don't Skip |
|-------|------|--------|------------|
| 1. Research + Concept | 1-2 hours | Validated topic, format decision | ✅ |
| 2. Script | 2-4 hours | Engineered script, visual cues | ✅ |
| 3. Generate Visuals | 2-4 hours | Shot list, AI-generated shots | ✅ |
| 4. Voiceover | 30-60 min | Clear, paced audio | ✅ |
| 5. Edit | 4-8 hours | Assembled, polished video | ✅ |
| 6. Thumbnail + Title | 1 hour | High-CTR packaging | ✅ |
| 7. Upload + Optimize | 30 min | SEO-optimized publish | ✅ |
| 8. Analyze | Ongoing | Learn, iterate, improve | ✅ |

**Total time:** 10-20 hours (for first few videos)  
**With practice:** 5-10 hours  
**With systems:** 2-5 hours

**Shortcut = amateur result.** Follow the process.

---

## Tools We Use

| Tool | Purpose | Cost |
|------|---------|------|
| **LTX Studio (LTX 2.3)** | AI video generation | TBD |
| **Grok Imagine** | AI video generation | Included in Premium |
| **DaVinci Resolve** | Video editing, color, audio | Free (or $295 Studio) |
| **ElevenLabs (sag)** | Voiceover, TTS | Included |
| **YouTube Audio Library** | Royalty-free music | Free |
| **Canva** | Thumbnail design | Free or $12/mo |
| **YouTube** | Publishing, analytics | Free |

---

*Workflow compiled: April 15, 2026 — 3:15 PM PDT*
*By: the original agent*
*For: All future video projects*

🎬🔥📹
