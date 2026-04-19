#!/usr/bin/env node
/**
 * main.js — YT Clipper orchestrator
 *
 * Steps:
 *   1. Fetch transcript     → data/transcript.json
 *   2. Select clips (Claude) → data/clips.json + data/review.md  [USER REVIEWS HERE]
 *   3. Download + cut        → video/full.mp4 + assets/clip-N.mp4
 *
 * Usage:
 *   clip "URL"                      → select 5 clips from full video
 *   clip "URL" 0 10                 → select 5 clips from 0–10 min range
 *   clip "URL" 5 20 --count 8       → select 8 clips from 5–20 min range
 *   clip "URL" --extract-only       → skip to download+cut after review
 */

const { execFileSync, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const TRANSCRIPT_JSON = path.join(ROOT, "data", "transcript.json");
const CLIPS_JSON = path.join(ROOT, "data", "clips.json");
const REVIEW_MD = path.join(ROOT, "data", "review.md");

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const has = (flag) => args.includes(flag);

  // Accept --url flag OR bare positional URL as first arg
  const url = get("--url") || args.find((a) => !a.startsWith("--") && (a.includes("youtube.com") || a.includes("youtu.be")));
  if (!url) {
    console.error('Usage: clip "https://youtube.com/watch?v=..." [startMin endMin] [--count N] [--extract-only]');
    process.exit(1);
  }

  // Positional numbers after the URL = start/end in minutes
  const positionalNums = args.filter((a) => !a.startsWith("--") && !a.includes("youtube.com") && !a.includes("youtu.be") && !isNaN(Number(a)));
  const startMin = positionalNums[0] != null ? String(positionalNums[0]) : null;
  const endMin   = positionalNums[1] != null ? String(positionalNums[1]) : null;

  return {
    url,
    count: get("--count") || "5",
    startMin,
    endMin,
    skipTranscript: has("--skip-transcript"),
    extractOnly: has("--extract-only"),
  };
}

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", ...opts });
}

async function main() {
  const { url, count, startMin, endMin, skipTranscript, extractOnly } = parseArgs();

  // ── Step 1: Transcript ────────────────────────────────────────────────────
  if (!extractOnly) {
    if (skipTranscript && fs.existsSync(TRANSCRIPT_JSON)) {
      console.log("Skipping transcript fetch (--skip-transcript).");
    } else {
      console.log("\n=== STEP 1: Fetching transcript ===");
      run("python", ["python/transcript.py", "--url", url]);
    }

    // ── Step 2: Clip selection ──────────────────────────────────────────────
    console.log("\n=== STEP 2: Selecting clips with Claude ===");
    const selectArgs = ["scripts/select_clips.js", "--count", count];
    if (startMin) selectArgs.push("--start", startMin);
    if (endMin)   selectArgs.push("--end", endMin);
    run("node", selectArgs);

    console.log(`\n✅ Review file ready: ${REVIEW_MD}`);
    console.log("Open data/review.md, check the clips, then re-run with --extract-only to proceed.\n");
    return;
  }

  // ── Step 3: Download + cut (after user approval) ──────────────────────────
  if (!fs.existsSync(CLIPS_JSON)) {
    console.error("Error: data/clips.json not found. Run without --extract-only first.");
    process.exit(1);
  }

  console.log("\n=== STEP 3: Downloading and cutting clips ===");
  run("node", ["scripts/extract.js", "--url", url]);

  console.log("\n✅ All clips extracted to assets/");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
