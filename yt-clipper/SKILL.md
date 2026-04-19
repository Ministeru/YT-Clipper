---
name: yt-clipper
description: >
  Transforms long-form YouTube videos (podcasts, interviews, lectures) into
  short-form viral clips for TikTok, Instagram Reels, and YouTube Shorts.
  Use when the user provides a YouTube URL, a transcript, or asks to "find
  clips", "make shorts", "extract highlights", "clip this video", or
  "turn this into a short". Analyzes transcripts for high-retention moments,
  outputs structured clips.json with timestamps and hooks, and orchestrates
  the full pipeline: transcript fetch → clip selection → user review → download
  → FFmpeg cut → Remotion render. Always use this skill for any YouTube
  clipping or short-form content extraction task.
---

# YT Clipper

Transforms long-form YouTube videos into short-form viral clips by analyzing transcripts, selecting high-retention moments, and orchestrating the full extraction and rendering pipeline.

## When to Use This Skill

- User provides a YouTube URL and wants clips/shorts
- User asks to "find highlights", "make a reel", "extract clips", or "clip this podcast"
- User provides a transcript and wants clip timestamps
- Any short-form content creation from a YouTube source

---

## Step 1: Fetch Transcript

Run the Python transcript fetcher with the YouTube URL:

```bash
python python/transcript.py --url "{youtube_url}"
# Output: data/transcript.json
# Expected: timestamped array of {text, start, duration} objects
```

If the transcript already exists at `data/transcript.json`, skip this step and use the existing file.

---

## Step 2: Analyze Transcript and Select Clips

Read `data/transcript.json` and identify 5–10 clips that maximize short-form retention.

### Selection Criteria (in priority order)

1. **Strong hooks** — bold statements, surprising claims, contrarian opinions
2. **Emotional peaks** — passion, frustration, excitement, personal stories
3. **Insight density** — clear takeaways, frameworks, actionable advice
4. **Controversy / tension** — disagreement, challenging common beliefs

### Clip Constraints

- Duration: **10–25 seconds** (ideal ~15 seconds)
- Must be **contextually complete** — no missing setup
- Must have a **strong opening hook** within the first sentence
- Avoid clips that rely on prior context, filler dialogue, or generic statements

### Hook Optimization

For each clip, extract or rewrite the opening line to maximize engagement:

- Original: "I think consistency is important"
- Optimized: "Most people fail because they're not consistent"

Make hooks: **direct**, **clear**, and **emotionally charged**.

---

## CRITICAL: Step 3 — User Review Before Any Download or Cut

**DO NOT proceed to download or FFmpeg until the user approves.**

Write a review file at `data/clips_review.md` containing:

- A numbered list of all selected clips
- For each clip: title, start/end timestamps, hook line, and reason it works
- A clear prompt asking the user to approve, remove, or adjust clips

Example format:

```markdown
# Clip Review — [Video Title]

Please review the clips below. Reply "approved" to proceed, or specify which clips to remove or adjust.

## Clip 1: "Discipline Truth" [2:00 – 2:15]
**Hook:** "Most people fail because they're not consistent"
**Why it works:** Contrarian opener with emotional charge — strong retention hook

## Clip 2: ...
```

Wait for explicit user approval before continuing.

---

## Step 4: Write clips.json

After user approval, write the final structured output to `data/clips.json`:

```json
{
  "clips": [
    {
      "title": "Short descriptive title",
      "start": 120,
      "end": 135,
      "hook": "Most people fail because they're not consistent",
      "reason": "Contrarian opener with emotional charge — strong retention hook"
    }
  ]
}
```

- `start` and `end` are in **seconds** (integers)
- All fields are required

---

## Step 5: Download and Extract Clips

Run the Node.js extraction script:

```bash
node scripts/extract.js
# Calls yt-dlp to download full video → video/full.mp4
# Calls FFmpeg to cut clips → assets/clip_01.mp4, assets/clip_02.mp4, ...
```

Expected output: one `.mp4` per clip in `assets/`.

---

## Step 6: Render Shorts (Optional)

If the user wants final rendered vertical shorts with captions and motion:

```bash
node scripts/render.js
# Passes clips to Remotion
# Output: Outputs/clip_01_final.mp4, ...
```

---

## Troubleshooting

### Transcript fetch fails
**Cause:** Video is private, age-restricted, or has no captions.
**Solution:** Ask the user to provide the transcript manually as text or `.txt` file.

### FFmpeg cut produces wrong segment
**Cause:** Timestamps are off due to transcript drift.
**Solution:** Adjust `start`/`end` values in `clips.json` and re-run `extract.js`.

### Remotion render crashes
**Cause:** Missing Remotion project setup or Node dependencies.
**Solution:** Run `npm install` in project root, verify `projects/` and `remotion/` folders exist.

---

## Quality Checklist

Before finishing, verify:

- [ ] `data/transcript.json` exists and is valid
- [ ] `data/clips_review.md` was shown to user and approved
- [ ] `data/clips.json` contains valid timestamps (seconds, not HH:MM:SS)
- [ ] All clips are 10–25 seconds
- [ ] Each clip has a strong hook
- [ ] `assets/` contains one file per clip after extraction
