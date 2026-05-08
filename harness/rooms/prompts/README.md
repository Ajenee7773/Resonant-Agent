# Prompts Room — Prompt Engineering Library

**Purpose:** Prompt templates for Grok Imagine, image generation, video animation.

---

## Grok Imagine — Image Prompts

### Structure
```
[Subject description — front-load this, strongest influence]
[Setting/background — from reference images]
[Lighting — specific, directional]
[Camera — locked, angle, depth of field]
[Mood — emotional tone]
[Style — photorealistic, cinematic, etc.]
--ar 16:9 --style raw --v 6
```

### Sweet Spot
- **600-800 words** for stills
- **400-800 words** for video
- Front-load character/subject description
- Reference images = the law (no hallucination)

---

## Grok Imagine — Video Prompts

### Critical Rules
1. **Camera:** 100% LOCKED — no pan, no tilt, no push, no drift
2. **Reference Image:** Upload first, reference in prompt
3. **Motion:** Specific seconds (0-3s, 3-6s, etc.) — precise timing
4. **Duration:** 10-15 seconds typically
5. **Loop:** If looping, specify loop point explicitly

### Example Structure
```
REFERENCE IMAGE: [uploaded image]

CAMERA: 100% LOCKED STATIC SHOT — no movement whatsoever

ACTION: [Describe what moves, for how long, at what speed]

ATMOSPHERE: [Subtle ambient movement only — lights, haze, etc.]

DURATION: 15 seconds

LOOP REQUIREMENT: [If looping, specify exact loop point]

--ar 16:9 --style raw --v 6 --motion 4
```

---

## Prompt Templates

### Character Consistency
```
**Character (locked from reference):**
- [Physical traits — skin, eyes, hair, etc.]
- [Expression — serious, pensive, etc.]
- [Attire — specific, consistent]
- [Pose — chest-up, full body, etc.]
```

### Setting from Reference
```
**Setting (from reference image):**
- [Describe what's in the reference]
- [Background elements — blurred vs. sharp]
- [Foreground elements — if any]
```

### Lighting Specifics
```
**Lighting:**
- [Source — natural, fluorescent, neon, etc.]
- [Direction — front, side, backlit, etc.]
- [Color temperature — warm, cool, mixed]
- [Mood — harsh, soft, dramatic, etc.]
```

---

## Reference-Driven Workflow

1. **Find reference** (Google Images, OpenArt, etc.)
2. **Upload to Grok** as reference image
3. **Write prompt** referencing the image ("from reference image...")
4. **Generate** — Grok uses reference as "the law"
5. **Iterate** — Adjust prompt, not reference

**Why this works:** Reference image prevents hallucination. Prompt guides, reference anchors.

---

**Last Updated:** [DATE]
**Status:** Active — Prompt engineering protocols
