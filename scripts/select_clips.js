#!/usr/bin/env node
/**
 * select_clips.js — Reads transcript.json, calls Claude to pick the best clips,
 * writes data/clips.json and data/review.md for user approval.
 *
 * Usage:
 *   node scripts/select_clips.js
 *   node scripts/select_clips.js --count 5   (default: 3)
 */

require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TRANSCRIPT_JSON = path.join(ROOT, "data", "transcript.json");
const CLIPS_JSON = path.join(ROOT, "data", "clips.json");
const REVIEW_MD = path.join(ROOT, "data", "review.md");

// ── helpers ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  const count  = get("--count") ? parseInt(get("--count"), 10) : 5;
  const startMin = get("--start") != null ? parseFloat(get("--start")) : null;
  const endMin   = get("--end")   != null ? parseFloat(get("--end"))   : null;
  return { count, startMin, endMin };
}

function loadTranscript() {
  if (!fs.existsSync(TRANSCRIPT_JSON)) {
    console.error(`Error: ${TRANSCRIPT_JSON} not found. Run transcript.py first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TRANSCRIPT_JSON, "utf8"));
}

function buildTranscriptText(entries, startMin, endMin) {
  const startSec = startMin != null ? startMin * 60 : 0;
  const endSec   = endMin   != null ? endMin   * 60 : Infinity;
  const filtered = entries.filter((e) => e.start >= startSec && e.start <= endSec);
  if (filtered.length === 0) {
    console.error(`Error: No transcript entries found between ${startMin}m and ${endMin}m.`);
    process.exit(1);
  }
  return filtered
    .map((e) => `[${e.start.toFixed(1)}s] ${e.text.replace(/\n/g, " ")}`)
    .join("\n");
}

// ── prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(transcriptText, videoId, count) {
  return `You are a viral short-form video editor. Your job is to identify the ${count} best clips from this YouTube transcript that would perform well as vertical shorts (TikTok / Reels / Shorts).

Video ID: ${videoId}

TRANSCRIPT (format: [timestamp_seconds] text):
${transcriptText}

SELECTION CRITERIA — pick moments that have:
- A strong hook in the first 2 seconds
- High emotional impact, surprise, or actionable insight
- Natural start/end points (complete thoughts)
- Duration between 20–59 seconds (ideal for shorts)

OUTPUT: Respond with ONLY a valid JSON object, no markdown fences, no commentary:
{
  "clips": [
    {
      "start": <number, seconds>,
      "end": <number, seconds>,
      "hook": "<one punchy sentence that captures why this clip is compelling>",
      "title": "<short title for the clip, 3-6 words>"
    }
  ]
}`;
}

// ── Claude call ───────────────────────────────────────────────────────────────

async function selectClips(transcriptData, count, startMin, endMin) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    console.error("Error: Set ANTHROPIC_API_KEY in your .env file.");
    process.exit(1);
  }

  const client = new Anthropic.default({ apiKey });
  const transcriptText = buildTranscriptText(transcriptData.transcript, startMin, endMin);
  const prompt = buildPrompt(transcriptText, transcriptData.video_id, count);

  console.log(`Sending transcript (${transcriptData.entry_count} entries) to Claude...`);

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system:
      "You are an expert short-form video editor. Always respond with valid JSON only — no markdown, no explanation.",
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].text.trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Claude returned invalid JSON:\n", raw);
    process.exit(1);
  }

  if (!Array.isArray(parsed.clips) || parsed.clips.length === 0) {
    console.error("Claude returned no clips.");
    process.exit(1);
  }

  return parsed;
}

// ── review markdown ───────────────────────────────────────────────────────────

function buildReviewMd(clipsData, transcriptData) {
  const lines = [
    `# Clip Review — ${transcriptData.video_id}`,
    "",
    `**Total clips selected:** ${clipsData.clips.length}`,
    "",
    "Review the clips below and confirm before running extraction.",
    "",
    "---",
    "",
  ];

  clipsData.clips.forEach((clip, i) => {
    const duration = (clip.end - clip.start).toFixed(1);
    lines.push(`## Clip ${i + 1}: ${clip.title}`);
    lines.push("");
    lines.push(`- **Start:** ${clip.start}s`);
    lines.push(`- **End:** ${clip.end}s`);
    lines.push(`- **Duration:** ${duration}s`);
    lines.push(`- **Hook:** ${clip.hook}`);
    lines.push("");

    // Pull the relevant transcript lines for context
    const relevant = transcriptData.transcript.filter(
      (e) => e.start >= clip.start - 1 && e.start <= clip.end + 1
    );
    if (relevant.length > 0) {
      lines.push("**Transcript excerpt:**");
      lines.push("");
      lines.push("```");
      relevant.forEach((e) => lines.push(`[${e.start.toFixed(1)}s] ${e.text.replace(/\n/g, " ")}`));
      lines.push("```");
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  lines.push("_Approve by running: `node scripts/extract.js --url <YouTube URL>`_");

  return lines.join("\n");
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { count, startMin, endMin } = parseArgs();
  const transcriptData = loadTranscript();

  const rangeLabel = startMin != null ? ` (${startMin}m – ${endMin != null ? endMin + "m" : "end"})` : "";
  console.log(`Loaded transcript for video: ${transcriptData.video_id}`);
  console.log(`Selecting ${count} clip(s)${rangeLabel}...\n`);

  const clipsData = await selectClips(transcriptData, count, startMin, endMin);

  fs.writeFileSync(CLIPS_JSON, JSON.stringify(clipsData, null, 2), "utf8");
  console.log(`clips.json written to: ${CLIPS_JSON}`);

  const reviewMd = buildReviewMd(clipsData, transcriptData);
  fs.writeFileSync(REVIEW_MD, reviewMd, "utf8");
  console.log(`Review file written to: ${REVIEW_MD}`);

  console.log("\n--- CLIPS SELECTED ---");
  clipsData.clips.forEach((c, i) => {
    console.log(`[${i + 1}] ${c.title}  (${c.start}s → ${c.end}s)  "${c.hook}"`);
  });
  console.log("\nOpen data/review.md to verify, then run extract.js to download and cut.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
