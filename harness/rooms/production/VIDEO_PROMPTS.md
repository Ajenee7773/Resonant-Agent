# Video Prompt Templates — AI Video Generation 🎬

**Purpose:** Refined prompt templates for LTX Studio (LTX 2.3), Grok Imagine, and Kling 2.0.

**How to use:** Copy the base prompt for your video style. Customize for your script. Generate variations. Iterate.

---

## Critical Additions (April 15, 2026 Transcript Insights)

### Standard Inclusions (Every Prompt)

**Add these to every Kling 2.0 prompt:**
- `no subtitles` — Kling auto-generates, reduces realism
- `no music` — Kling auto-generates, makes splicing impossible

**Add film grain in post:**
- Overlay blend mode at 30% opacity
- Subconscious realism boost

### Reference Sheet Protocol

**For character consistency:**
1. Generate character reference sheet (multiple angles: front, side, back, 3/4)
2. Include in prompt: "The [character] from image 2 [does action]..."
3. Use same reference sheets across all shots

**For style consistency:**
1. Pick one shot as "style anchor"
2. Include in all prompts: "in the same visual style as image X"
3. Ensures consistent color grade, lighting, aesthetic

---

## Video Medium Specifications (Tip 1)

**Default AI style = plastic, shiny, oversaturated, fake.**

**Specify the medium explicitly:**

| Medium | Prompt Keywords | Look |
|--------|-----------------|------|
| **VHS Camcorder** | "VHS footage, retro camcorder, 1980s, timestamp overlay, slight static, lower resolution" | Older, unpolished, authentic |
| **Documentary** | "Documentary footage, neutral colors, high quality, natural lighting, cinema verité" | Credible, observational |
| **Smartphone** | "Shot on smartphone, vertical video, distorted perspective, handheld shake, Instagram story" | Modern, casual, authentic |
| **Webcam** | "Webcam footage, 720p, slight compression artifacts, indoor lighting, live stream" | Raw, immediate, real |
| **Cinema Camera** | "Shot on ARRI Alexa, cinematic color grade, 4K, professional lighting, film look" | Produced, high-end |

**Example:**
> "VHS camcorder footage of a man sitting at a desk in a modern office, cup of coffee on table. 1980s retro camcorder, timestamp overlay, slight static. No subtitles, no music. --ar 16:9"

---

## Lighting Specifications (Tip 2)

**Lighting signals context. Wrong lighting = fake.**

| Lighting Type | Prompt Keywords | Best For |
|---------------|-----------------|----------|
| **Natural** | "Natural lighting, window light, practical lamps, soft shadows, not overly perfect" | Most realistic AI videos |
| **Studio** | "Bright studio lighting, evenly lit, professional, polished" | Professional content (can look too perfect) |
| **Cinematic** | "Bold saturated colors, high contrast, dramatic shadows, film lighting" | Produced films, less natural |

**Example:**
> "Natural lighting through window, practical lamp on desk, soft shadows, not overly perfect. Feels like webcam footage captured in real life. No subtitles, no music."

---

## Subject Rules (Tips 4 & 5)

**Subject Size:**
- ✅ **Close-up** (subject fills 60-80% of frame) = most realistic
- ✅ **Medium** (subject fills 30-60% of frame) = good
- ❌ **Wide** (subject fills <30% of frame) = faces melt, not enough pixels

**Subject Count:**
- ✅ **1-3 subjects** = AI can handle detail
- ⚠️ **4-10 subjects** = Kling 2.0 okay, but zoom in reveals issues
- ❌ **Crowds (10+)** = people vanish/morph on close inspection

**Example (good):**
> "Close-up shot of man at desk, face fills 70% of frame, intimate webcam perspective. No subtitles, no music."

**Example (bad):**
> "Wide shot of crowded subway station, dozens of people walking." ❌

---

## Motion Complexity (Tips 8 & 9)

**Simple motion = realistic. Complex motion = errors.**

| Motion Type | Realism | When to Use |
|-------------|---------|-------------|
| **Static/slight movement** | ✅ Highest | Interviews, conversations, contemplative |
| **Tracking shot** | ✅ High | Following character, walking, simple action |
| **Simple continuous** | ✅ Good | Reaching, turning, gesturing |
| **Complex action** | ⚠️ Lower | Fight scenes, chases (requires multi-gen splicing) |
| **Crowd motion** | ❌ Lowest | Avoid unless background/blurry |

**Multi-Generation Splicing Workflow (for action):**
1. Generate same scene 3-5 times
2. Extract best clips from each generation
3. Combine into single scene
4. Use "no music, no subtitles" in all prompts

---

## Character Reference Sheets (Tip 6)

**For consistent characters across shots:**

**Prompt structure:**
```
[Image 1: Scene setup]
[Image 2: Character A reference sheet - front, side, back]
[Image 3: Character B reference sheet - front, side, back]

"The man from image 2 and woman from image 3 sit at table eating ramen in convenience store. The woman from image 3 looks at the man from image 2 nervously, observing him carefully. She is concerned for him and the man just looks down at his ramen. Character appearances match reference sheets exactly. No subtitles, no music. --ar 16:9"
```

**Why it works:** Reference sheets anchor the model's understanding of character identity across multiple shots.

---

## Style Reference (Tip 7)

**For consistent visual style across shots:**

**Prompt structure:**
```
[Image 1: Style anchor shot (the look you want)]
[Image 2: Character reference sheet]
[Image 3: Scene description]

"Create a photo of the man and woman sitting at table in convenience store with prepackaged ramen in front of them, in the same visual style as image 1. The woman from image 2 looks at the man nervously. Match color grade, lighting, and aesthetic of image 1 exactly. No subtitles, no music. --ar 16:9"
```

**Why it works:** Style reference transfers color grade, lighting aesthetic, and overall look across all shots.

---

## Film Grain Post-Production (Tip 10)

**Not a prompt — this is done in editing:**

1. Get film grain overlay (Gumroad, free packs)
2. Import into DaVinci Resolve (or editor)
3. Place overlay on top of video track
4. Change blend mode to "Overlay"
5. Reduce opacity to ~30%

**Effect:** Subconscious realism boost. You shouldn't visibly see it — you should *feel* it.

---

## LTX Studio (LTX 2.3) — Prompt Structure

**LTX Studio specializes in:** Scene-by-scene control, shot composition, character consistency (within shots), cinematic pacing.

**Base prompt structure:**
```
[Scene description] + [Visual style] + [Camera movement] + [Lighting] + [Mood/emotion] + [Duration] + [Medium specification] + "no subtitles, no music" + --ar 16:9
```

---

### LTX-1: Cinematic Documentary (Our Primary Style)

**Best for:** Essay-style videos, thought leadership, conceptual content

```
Cinematic documentary style. [SCENE DESCRIPTION — e.g., "A vast vertical farm stretches into the horizon, rows of green plants under purple LED lights, agricultural robots moving silently between rows"]. Visual style: [STYLE — e.g., "cyberpunk meets sustainability, teal and orange color grade, high contrast"]. Camera: [MOVEMENT — e.g., "slow drone pan left to right, establishing shot"]. Lighting: [LIGHTING — e.g., "dramatic side lighting, deep shadows, neon accents"]. Mood: [EMOTION — e.g., "hopeful but serious, sense of scale and possibility"]. Duration: 8-12 seconds. --ar 16:9
```

**Customization:**
- `[SCENE DESCRIPTION]` → What's happening in the shot
- `[STYLE]` → Aesthetic reference (cyberpunk, minimalist, realistic, etc.)
- `[CAMERA MOVEMENT]` → Static, pan, zoom, tracking, drone, etc.
- `[LIGHTING]` → Natural, dramatic, neon, soft, harsh, etc.
- `[EMOTION]` → What the viewer should feel

---

### LTX-2: Conceptual/Abstract (For Ideas)

**Best for:** Making abstract concepts visual, transitions, B-roll

```
Abstract conceptual visualization. [CONCEPT — e.g., "The flow of capital transforming into physical infrastructure, money morphing into buildings and machines"]. Visual style: [STYLE — e.g., "minimalist 3D animation, clean lines, white and gold on black"]. Camera: [MOVEMENT — e.g., "slow push-in, then rotate 180 degrees"]. Lighting: [LIGHTING — e.g., "soft ambient glow, no harsh shadows"]. Mood: [EMOTION — e.g., "intellectual, elegant, thought-provoking"]. Duration: 5-8 seconds. --ar 16:9
```

**Use cases:**
- Transition between sections
- Visualizing abstract ideas (money, systems, consciousness)
- Opening/closing sequences

---

### LTX-3: Futuristic/Sci-Fi (For Speculation)

**Best for:** "What if" scenarios, future visions, speculative content

```
Futuristic sci-fi aesthetic. [SCENE — e.g., "A city in 2050, skyscrapers covered in vertical gardens, flying delivery drones, solar panels on every surface, people walking peacefully below"]. Visual style: [STYLE — e.g., "solarpunk, optimistic futurism, bright natural lighting, green and blue palette"]. Camera: [MOVEMENT — e.g., "aerial establishing shot, slow descent to street level"]. Lighting: [LIGHTING — e.g., "golden hour, warm sunlight, lens flares"]. Mood: [EMOTION — e.g., "hopeful, aspirational, achievable utopia"]. Duration: 10-15 seconds. --ar 16:9
```

**Aesthetic options:**
- **Solarpunk** → Optimistic, green, sustainable future
- **Cyberpunk** → Dark, neon, high-tech/low-life
- **Minimalist** → Clean, white, Apple-store aesthetic
- **Retro-future** → 1950s vision of tomorrow

---

### LTX-4: Data Visualization (For Numbers/Stats)

**Best for:** Making data visual, charts, comparisons

```
Animated data visualization. [DATA — e.g., "$141 billion one-time investment vs. $125 billion annual spending, showing the comparison as two bars growing, then the one-time bar stops while the annual bar keeps growing infinitely"]. Visual style: [STYLE — e.g., "clean motion graphics, white text on dark blue, professional news-style"]. Camera: [MOVEMENT — e.g., "static frame, animated elements only"]. Lighting: [LIGHTING — e.g., "even, no shadows, clear readability"]. Mood: [EMOTION — e.g., "authoritative, clear, undeniable"]. Duration: 6-10 seconds. --ar 16:9
```

**Tips:**
- Keep text minimal (let voiceover explain)
- Animate the *change* (not just static charts)
- Use color to differentiate (blue vs. orange, etc.)

---

### LTX-5: Human Element (Use Sparingly — Uncanny Valley Risk)

**Best for:** Silhouettes, backs of heads, hands, distant figures (NOT close-up faces)

```
Human presence shot. [SCENE — e.g., "A person standing on a hill overlooking a valley of vertical farms, seen from behind, silhouette against sunset"]. Visual style: [STYLE — e.g., "cinematic, wide shot, human is small in frame"]. Camera: [MOVEMENT — e.g., "slow push-in from wide to medium"]. Lighting: [LIGHTING — e.g., "golden hour, backlit, rim lighting on figure"]. Mood: [EMOTION — e.g., "contemplative, small human, big vision"]. Duration: 8-12 seconds. --ar 16:9

**WARNING:** Do NOT generate close-up human faces. Uncanny valley. Use:
- Silhouettes ✅
- Backs of heads ✅
- Hands only ✅
- Distant figures (indistinct) ✅
- Close-up faces ❌
```

---

## Grok Imagine — Video Prompt Structure

**Grok Imagine specializes in:** Prompt-to-video, rapid generation, stylized aesthetics, conceptual visuals.

**Base prompt structure:**
```
[Subject] + [Action] + [Style] + [Lighting/Color] + [Camera] + [Mood] + --ar 16:9 --duration 5s
```

---

### Grok-1: Minimalist Typography (For Titles/Quotes)

**Best for:** Title cards, quote overlays, section breaks

```
Minimalist typography animation. Text "[YOUR TEXT]" appears on screen with subtle animation. Background: [COLOR/GRADIENT — e.g., "deep navy blue (#0a1628) to black gradient"]. Text style: [FONT — e.g., "bold geometric sans-serif, white, centered"]. Animation: [MOVEMENT — e.g., "fade in from bottom, hold 3 seconds, fade out"]. Mood: [EMOTION — e.g., "clean, professional, authoritative"]. --ar 16:9 --duration 5s
```

---

### Grok-2: Conceptual Morphing (For Transformations)

**Best for:** Before/after, transformation sequences, idea evolution

```
Conceptual morphing sequence. [START] transforms into [END] over 8 seconds. Example: "Barren desert landscape transforms into lush vertical farm, showing the transition smoothly." Visual style: [STYLE — e.g., "photorealistic CGI, smooth interpolation"]. Color palette: [COLORS — e.g., "brown/tan → green/blue"]. Camera: [MOVEMENT — e.g., "static wide shot, let the transformation happen"]. Mood: [EMOTION — e.g., "transformation, hope, possibility"]. --ar 16:9 --duration 8s
```

---

### Grok-3: Stylized Aesthetic (For Branding)

**Best for:** Consistent visual identity across videos

```
[SCENE DESCRIPTION] in [AESTHETIC STYLE] style. Example: "A server room with AI running, in solarpunk aesthetic style — green plants integrated with technology, natural lighting, optimistic futurism." Color palette: [COLORS — e.g., "forest green, sky blue, warm white"]. Lighting: [LIGHTING — e.g., "natural sunlight through windows, soft shadows"]. Camera: [MOVEMENT — e.g., "slow pan left to right"]. Mood: [EMOTION — e.g., "hopeful, integrated, harmonious"]. --ar 16:9 --duration 10s
```

**Aesthetic styles to test:**
- **Solarpunk** → Green tech, optimistic, natural + technological
- **Cyberpunk** → Neon, dark, high contrast, futuristic
- **Minimalist** → Clean, white, Apple aesthetic
- **Brutalist** → Concrete, raw, industrial
- **Retro** → 70s/80s warmth, film grain, nostalgic

---

### Grok-4: Abstract Motion (For Transitions/B-Roll)

**Best for:** Filler that's not filler, transitions, mood-setting

```
Abstract motion graphics. [CONCEPT — e.g., "Flowing data streams, particles moving in organized patterns, representing information flow"]. Visual style: [STYLE — e.g., "3D particle simulation, glowing trails"]. Color palette: [COLORS — e.g., "blue and white on black, or gold on navy"]. Camera: [MOVEMENT — e.g., "camera moves through the particle field"]. Lighting: [LIGHTING — e.g., "self-illuminated particles, no external light"]. Mood: [EMOTION — e.g., "hypnotic, technological, mesmerizing"]. --ar 16:9 --duration 6s
```

---

### Grok-5: Symbolic Imagery (For Metaphors)

**Best for:** Visual metaphors, conceptual reinforcement

```
Symbolic visual metaphor. [METAPHOR — e.g., "A single seed growing into a massive tree, but the tree is made of circuit boards and the leaves are microchips"]. Visual style: [STYLE — e.g., "surreal CGI, photorealistic textures"]. Color palette: [COLORS — e.g., "green circuit board, gold connections, dark background"]. Camera: [MOVEMENT — e.g., "time-lapse style growth, camera circles around the tree"]. Lighting: [LIGHTING — e.g., "dramatic spotlight from above"]. Mood: [EMOTION — e.g., "growth, technology, nature integrated"]. --ar 16:9 --duration 10s
```

---

## The Civilization Engine — Specific Prompts

**Video:** Based on the book *The Civilization Engine: The End of Scarcity*  
**Aesthetic:** Documentary + Conceptual + Futuristic (solarpunk)  
**Palette:** Deep navy (#0a1628), Forest green (#2d501f), White (#ffffff), Gold accent (#d4af37)

---

### CE-Video-1: Opening Hook (The Trap)

```
Cinematic documentary opening. Visual: A person at a factory job, repetitive motion, gray industrial setting, clock ticking, feeling of being trapped. Color grade: Desaturated, cold, blue-gray tones. Camera: Static medium shot, slight push-in. Lighting: Harsh fluorescent, deep shadows. Mood: Oppressive, relatable, "this is the trap." Duration: 10 seconds. Voiceover hook: "There is a person who works at a gun factory. They don't own guns. They don't believe in guns. But they go to work every day. Why?" --ar 16:9
```

---

### CE-Video-2: The Inflection Point (Abundance is Possible)

```
Conceptual transformation sequence. Visual: Split screen. Left: Traditional farm, struggling farmer, drought, scarcity. Right: Vertical farm, robots tending, abundance, green everywhere. Transition: Left side fades to right side, showing the choice. Color: Brown/desaturated → vibrant green. Camera: Static split, then merge. Lighting: Overcast → bright, hopeful. Mood: "The math changed. The system didn't." Duration: 12 seconds. --ar 16:9
```

---

### CE-Video-3: The Blueprint (Vertical Farms)

```
Futuristic solarpunk aesthetic. Visual: A massive vertical farm facility, 30 stories tall, covered in green plants, solar panels on the roof, robots moving inside visible through glass walls. Location: Arizona desert, surrounded by converted farmland. Color: Green, blue, white, gold accents. Camera: Drone shot, orbit the facility, then push into interior. Lighting: Golden hour, warm sunlight through glass. Mood: "This is buildable. This is real." Duration: 15 seconds. --ar 16:9
```

---

### CE-Video-4: The Numbers ($141B Once vs. $125B Forever)

```
Animated data visualization. Visual: Two bars grow on screen. Left bar: "$141 BILLION ONCE" — stops growing. Right bar: "$125 BILLION / YEAR" — keeps growing, year counter spins: 1 year, 2 years, 5 years, 10 years, 50 years. At 50 years, right bar shows "$6.25 TRILLION" vs. left bar "$141 BILLION." Color: Navy background, white text, green for once, orange for recurring. Camera: Static frame, animated elements only. Lighting: Even, clear readability. Mood: "The math isn't close." Duration: 12 seconds. --ar 16:9
```

---

### CE-Video-5: The Promise (What Your Life Looks Like After)

```
Cinematic hopeful sequence. Visual: A person wakes up without an alarm. Walks to kitchen. Kids eating breakfast. No tension. No calculating. Food is free. Community server room in library background. People building, creating, teaching — not because they have to, but because they choose to. Color: Warm, golden, inviting. Camera: Slow pans, intimate shots. Lighting: Natural morning light, soft. Mood: "This is what freedom looks like." Duration: 20 seconds. --ar 16:9
```

---

### CE-Video-6: The Call to Action (Build)

```
Inspirational closing sequence. Visual: Montage of communities building — vertical farms, server rooms, 3D printed houses, people working together. Text overlay: "The technology exists. The money exists. The land exists. The only thing missing is the decision." Final frame: "The Civilization Engine — Available Now on Amazon." Color: Hopeful, varied (diverse communities, diverse landscapes). Camera: Quick cuts, energetic. Lighting: Bright, clear. Mood: "We're not waiting. We're building." Duration: 15 seconds. --ar 16:9
```

---

## Prompt Engineering Principles

**What I learned (from book cover craft, applied to video):**

| Principle | Application |
|-----------|-------------|
| **Specificity = Quality** | "Slow drone pan left to right" > "camera moves" |
| **Style References = Consistency** | "Solarpunk aesthetic" triggers trained patterns |
| **Duration Control = Pacing** | Specify seconds for each shot |
| **Color Codes = Precision** | "#0a1628" > "dark blue" |
| **Mood/Emotion = AI Guidance** | "Hopeful but serious" guides the generation |
| **Camera Movement = Cinematic** | Static vs. pan vs. zoom vs. drone changes everything |

**Prompt structure:**
```
[Subject/Scene] + [Visual Style] + [Camera] + [Lighting] + [Color/Mood] + [Duration] + --ar 16:9
```

**Iterate prompts, not just videos:**
- If videos aren't working, refine the prompt
- Add specificity (seconds, colors, movements)
- Remove ambiguity (no "maybe," "sort of")

---

## Compounding the Craft

**After each video, log here:**

| Video | Best Prompt | Worst Prompt | Lesson Learned |
|-------|-------------|--------------|----------------|
| TBD | TBD | TBD | TBD |

**Prompts evolve.** Every video teaches us something. Every lesson makes the next prompt better.

---

*Compiled: April 15, 2026 — 3:10 PM PDT*
*By: the original agent*
*For: All future video projects*

🎬🔥📹
