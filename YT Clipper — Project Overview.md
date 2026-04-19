---
tags:
  - project
  - video-production
  - automation
  - ai
  - node
  - python
  - remotion
created: 2026-04-14
status: active
---

# YT Clipper — Project Overview

> A fully automated content engine that transforms long-form YouTube videos into viral vertical shorts. Give it a URL — it fetches the transcript, uses Claude to pick the best moments, downloads and cuts the video, then renders polished 9:16 Shorts with animated captions and background music.

---

## What It Does

1. **Fetch Transcript** — Python pulls timestamped captions via `youtube-transcript-api`
2. **AI Clip Selection** — Claude analyzes the transcript and picks the N best moments with hooks and titles
3. **Human Review Gate** — Generates `data/review.md` for approval before any download begins
4. **Download + Cut** — `yt-dlp` downloads the full video; FFmpeg cuts precise clips
5. **Render** — Remotion composites each clip into a 1080×1920 vertical short with word-by-word captions, slow zoom, and optional lo-fi background music

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Intelligence | Claude (claude-opus-4-6) | Transcript analysis, clip selection |
| Transcript | `youtube-transcript-api` (Python) | Fetch timestamped captions from YouTube |
| Download | `yt-dlp` | Download full video as MP4 |
| Video Processing | FFmpeg | Cut clips from full video |
| Rendering | Remotion 4.x + React 19 | Compose vertical shorts with captions/effects |
| API SDK | `@anthropic-ai/sdk` ^0.88 | Call Claude from Node.js |
| Runtime | Node.js + Python 3 | Orchestration and transcript fetching |
| Config | `dotenv` | Manage API keys |

---

## Project Structure

```
YT Clipper/
│
├── main.js                     # ← Entry point / pipeline orchestrator
│
├── python/
│   └── transcript.py           # Step 1: fetches YouTube transcript → JSON
│
├── scripts/
│   ├── select_clips.js         # Step 2: sends transcript to Claude, writes clips.json + review.md
│   ├── extract.js              # Step 3: yt-dlp download + FFmpeg accurate clip cutting
│   └── render.js               # Step 4: Remotion renderer with local HTTP asset server
│
├── remotion/
│   ├── index.js                # Remotion entry point (registerRoot)
│   ├── Root.jsx                # Composition: 1080×1920, 30fps, "VerticalShort" id
│   ├── VerticalShort.jsx       # Main composition: video + slow zoom + audio + captions
│   └── CaptionTrack.jsx        # Word-by-word caption reveal, timed to phrase duration
│
├── data/
│   ├── transcript.json         # Raw transcript output (video_id, entry_count, transcript[])
│   ├── clips.json              # Selected clips (start, end, hook, title)
│   └── review.md               # Human-readable review file — approve before extracting
│
├── video/
│   └── full.mp4                # Downloaded full video (+ split streams if yt-dlp needed them)
│
├── assets/                     # FFmpeg-cut clips: clip-1.mp4, clip-2.mp4, ...
├── Outputs/                    # Final Remotion-rendered vertical shorts
│
├── yt-clipper/
│   └── SKILL.md                # Claude Code skill definition for this pipeline
├── CLAUDE.md                   # Project rules and guidelines for Claude
└── package.json                # Node dependencies
```

---

## Key Files — Deep Dive

### `main.js` — Orchestrator
The CLI entry point. Accepts a YouTube URL and flags:

```bash
node main.js "URL"                      # transcript + clip selection (outputs review.md)
node main.js "URL" --extract-only       # download + cut (after user approves review.md)
node main.js "URL" 5 20 --count 8       # select 8 clips from minutes 5–20
```

Two-phase design enforces the human review gate: first run outputs `data/review.md` and stops. Second run (with `--extract-only`) does the download and cutting.

---

### `python/transcript.py` — Transcript Fetcher
Uses `YouTubeTranscriptApi` to fetch captions. Priority: manually-created English → auto-generated English → any available language. Outputs:

```json
{
  "video_id": "SQux0OTe9sQ",
  "entry_count": 924,
  "transcript": [
    { "text": "phrase text", "start": 56.2, "duration": 2.4 },
    ...
  ]
}
```

---

### `scripts/select_clips.js` — Claude Clip Selector
Sends the transcript (formatted as `[timestamp_seconds] text`) to `claude-opus-4-6`. Instructs Claude to find N clips with:
- Strong hook in first 2 seconds
- High emotional impact or actionable insight  
- Natural start/end (complete thoughts)
- Duration 20–59 seconds

Outputs `data/clips.json` and `data/review.md` with transcript excerpts per clip.

---

### `scripts/extract.js` — Downloader + Cutter
**FFmpeg resolution** (in priority order):
1. System PATH
2. WinGet install location (`%LOCALAPPDATA%/Microsoft/WinGet/Packages/Gyan.FFmpeg_...`)
3. Remotion bundled binary (`node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe`)

**Split stream handling**: If yt-dlp downloads separate video (`full.f*.mp4`) and audio (`full.f*.m4a`) streams (happens when FFmpeg wasn't available during download), they are detected and merged automatically before cutting.

**Accurate seeking**: Uses `-ss` *after* `-i` for frame-precise cuts that keep caption timestamps perfectly in sync:

```js
ffmpeg -y -i full.mp4 -ss {start} -t {duration} -c:v libx264 -c:a aac -preset fast clip-N.mp4
```

---

### `scripts/render.js` — Remotion Renderer
**Local HTTP asset server**: Spins up an ephemeral HTTP server (random port on 127.0.0.1) to serve `assets/` files. This is required because Remotion's `OffthreadVideo` cannot load `file://` URLs.

**RFC 7233 range requests**: The server properly handles `Range: bytes=X-Y` headers with `206 Partial Content` responses. This is critical — without it, Remotion cannot extract audio tracks from the served MP4 files.

**Per-clip render**: For each clip, injects `videoSrc` (HTTP URL), `captions` (filtered transcript entries), `clipStart`, `clipDuration`, and optional `musicSrc` as Remotion `inputProps`. Duration in frames is computed as `Math.round(clipDuration * 30)` and injected into the composition at render time.

---

### `remotion/VerticalShort.jsx` — Main Composition
- **Slow zoom**: `scale` interpolates from `1.3` → `1.38` over the clip duration
- **Crop**: `translateX(10%) translateY(-8%)` re-centers the 16:9 source on the speaker
- **Video**: `<OffthreadVideo>` with `objectFit: cover` — no `startFrom` (clips are pre-cut, start at 0)
- **Music**: Optional `<Audio src={musicSrc} volume={0.12} />` lo-fi background track
- **Captions**: `<CaptionTrack>` overlay

---

### `remotion/CaptionTrack.jsx` — Caption Overlay
Renders word-by-word pop-in captions at the bottom third of the frame.

**Timing logic**:
- `currentSec = clipStart + frame / fps` — maps Remotion frames to absolute video time
- Finds the active transcript phrase where `currentSec` falls within `[start, start + duration]`
- Splits the phrase into words and distributes them proportionally across the phrase's actual spoken duration:

```js
const wordInterval = entryDurationFrames / words.length;
const wordFrame = entryFrame + Math.round(i * wordInterval);
```

This means word reveal speed tracks the speaker — fast speech = fast words, slow speech = slow words.

**Style**: Arial Black / Impact, 72px, uppercase, white with heavy 4-sided black stroke + drop shadow.

---

## Pipeline Commands

```bash
# Full pipeline — step 1+2 (transcript + clip selection, outputs review.md)
node main.js "https://youtube.com/watch?v=VIDEO_ID"

# After reviewing data/review.md — step 3 (download + cut)
node main.js "https://youtube.com/watch?v=VIDEO_ID" --extract-only

# Render specific clips
node scripts/render.js 1
node scripts/render.js 1 2 5
node scripts/render.js 1-5
node scripts/render.js all
```

---

## Environment Variables

```env
# .env (git-ignored)
ANTHROPIC_API_KEY=your_key_here

# Optional — ElevenLabs for AI voiceover
ELEVENLABS_API_KEY=your_key_here
```

---

## Current Session State (as of 2026-04-14)

**Active video**: `SQux0OTe9sQ` — WWII / Germany history video

**8 clips selected** in `data/clips.json`:

| # | Title | Start → End | Duration |
|---|---|---|---|
| 1 | Germany Marches Again | 56s → 99s | 43s |
| 2 | The Stab In The Back Myth | 100s → 165s | 65s |
| 3 | The Versailles Time Bomb | 190s → 248s | 58s |
| 4 | Hyperinflation And Hitler's Rise | 280s → 340s | 60s |
| 5 | The Crash That Gave Hitler Power | 394s → 458s | 64s |
| 6 | Hitler's Secret Rearmament | 518s → 570s | 52s |
| 7 | Why The Allies Were Weak | 1648s → 1700s | 52s |
| 8 | The Nazi-Soviet Pact | 2999s → 3046s | 47s |

**Asset state**:
- `assets/`: clip-1 through clip-5 cut ✅ (accurate FFmpeg seeking)
- `video/`: `full.mp4` + original split streams (`full.f399.mp4`, `full.f140.m4a`) present
- `Outputs/`: Clip 1 rendered and approved; currently testing caption sync fix

**Next steps**:
- [ ] Confirm clip 1 caption timing is correct with the proportional word-reveal fix
- [ ] Re-cut clips 6, 7, 8 (not yet in assets/)
- [ ] Render all 8 clips

---

## Known Issues & Fixes Applied

| Issue | Root Cause | Fix |
|---|---|---|
| No sound in render | Asset server returned `200` for range requests | Implemented RFC 7233: `206 Partial Content` with `Content-Range` header |
| Frozen / wrong timestamp | `startFrom` on pre-cut clips seeked past EOF | Removed `startFrom` — clips start at frame 0 |
| Captions not synced | Fast FFmpeg seek (`-ss` before `-i`) snaps to nearest keyframe | Moved `-ss` after `-i` for frame-accurate cutting |
| Words revealed too slowly | Word interval = `clipDuration / wordCount` (could be 1–2s/word) | Fixed: words distributed across their phrase's actual `duration` field |
| FFmpeg not found | WinGet install doesn't update shell PATH | `resolveFfmpeg()` checks WinGet path and Remotion bundle as fallbacks |
| Split stream download | yt-dlp downloaded video+audio separately (no FFmpeg at download time) | `findSplitStreams()` detects and merges them before cutting |
| `registerRoot` missing | `remotion/index.js` only exported a component | Added `registerRoot(RemotionRoot)` call |
| `file://` URLs rejected | `OffthreadVideo` requires HTTP | Local HTTP server in `render.js` serves `assets/` directory |

---

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.88.0",
  "@remotion/cli": "^4.0.448",
  "@remotion/renderer": "^4.0.448",
  "dotenv": "^17.4.2",
  "react": "^19.2.5",
  "react-dom": "^19.2.5",
  "remotion": "^4.0.448"
}
```

**External tools required**:
- `python` + `pip install youtube-transcript-api`
- `yt-dlp` (on PATH)
- `ffmpeg` (WinGet: `winget install Gyan.FFmpeg`, or auto-detected)

---

## Optional Features

- **ElevenLabs voiceover**: Drop an `ELEVENLABS_API_KEY` in `.env`. Voice ID stored in `config.json` (not sensitive).
- **Background music**: Place `assets/music.mp3` — renderer auto-detects and mixes at 12% volume.
- **Time-range clipping**: Pass `startMin endMin` to `main.js` or `--start`/`--end` to `select_clips.js` to focus Claude's analysis on a specific section of a long video.
