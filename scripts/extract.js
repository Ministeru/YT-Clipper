#!/usr/bin/env node
/**
 * extract.js — Downloads a YouTube video via yt-dlp and cuts clips with FFmpeg.
 *
 * Usage:
 *   node scripts/extract.js --url "https://www.youtube.com/watch?v=VIDEO_ID"
 *
 * Reads:  data/clips.json
 * Writes: video/full.mp4, assets/clip-{n}.mp4
 */

const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CLIPS_JSON = path.join(ROOT, "data", "clips.json");
const VIDEO_DIR = path.join(ROOT, "video");
const VIDEO_PATH = path.join(VIDEO_DIR, "full.mp4");
const ASSETS_DIR = path.join(ROOT, "assets");

// ── resolve ffmpeg ────────────────────────────────────────────────────────────

function resolveFfmpeg() {
  // 1. Already on PATH
  const probe = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (probe.status === 0) return "ffmpeg";

  // 2. WinGet install location
  const wingetBin = path.join(
    process.env.LOCALAPPDATA || "",
    "Microsoft", "WinGet", "Packages",
    "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
    "ffmpeg-8.1-full_build", "bin", "ffmpeg.exe"
  );
  if (fs.existsSync(wingetBin)) return wingetBin;

  // 3. Bundled with Remotion
  const remotionBin = path.join(
    ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe"
  );
  if (fs.existsSync(remotionBin)) return remotionBin;

  console.error("Error: ffmpeg not found. Install it with: winget install Gyan.FFmpeg");
  process.exit(1);
}

const FFMPEG = resolveFfmpeg();

// ── helpers ──────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--url");
  if (idx === -1 || !args[idx + 1]) {
    console.error("Usage: node scripts/extract.js --url <YouTube URL>");
    process.exit(1);
  }
  return { url: args[idx + 1] };
}

function ensureDirs() {
  [VIDEO_DIR, ASSETS_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));
}

function loadClips() {
  if (!fs.existsSync(CLIPS_JSON)) {
    console.error(`Error: ${CLIPS_JSON} not found. Run Claude clip selection first.`);
    process.exit(1);
  }
  const { clips } = JSON.parse(fs.readFileSync(CLIPS_JSON, "utf8"));
  if (!Array.isArray(clips) || clips.length === 0) {
    console.error("Error: clips.json contains no clips.");
    process.exit(1);
  }
  return clips;
}

// ── download ──────────────────────────────────────────────────────────────────

function findSplitStreams() {
  const files = fs.readdirSync(VIDEO_DIR);
  const video = files.find((f) => /^full\.f\d+\.mp4$/.test(f));
  const audio = files.find((f) => /^full\.f\d+\.(m4a|webm|opus)$/.test(f));
  return { video: video ? path.join(VIDEO_DIR, video) : null, audio: audio ? path.join(VIDEO_DIR, audio) : null };
}

function mergeSplitStreams(videoSrc, audioSrc) {
  console.log(`Merging split streams into ${VIDEO_PATH}...`);
  execFileSync(
    FFMPEG,
    ["-y", "-i", videoSrc, "-i", audioSrc, "-c", "copy", VIDEO_PATH],
    { stdio: "inherit" }
  );
  console.log("Merge complete.");
}

function downloadVideo(url) {
  if (fs.existsSync(VIDEO_PATH)) {
    console.log(`Video already exists at ${VIDEO_PATH}, skipping download.`);
    return;
  }

  // If yt-dlp previously downloaded split streams without ffmpeg, merge them now
  const { video, audio } = findSplitStreams();
  if (video && audio) {
    console.log(`Found split streams: ${path.basename(video)} + ${path.basename(audio)}`);
    mergeSplitStreams(video, audio);
    return;
  }

  console.log(`Downloading video: ${url}`);
  execFileSync(
    "yt-dlp",
    [
      "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      "--ffmpeg-location", path.dirname(FFMPEG),
      "--merge-output-format", "mp4",
      "--output", VIDEO_PATH,
      url,
    ],
    { stdio: "inherit" }
  );
  console.log(`Downloaded to: ${VIDEO_PATH}`);
}

// ── cut clips ────────────────────────────────────────────────────────────────

function cutClip(clip, index) {
  const outPath = path.join(ASSETS_DIR, `clip-${index + 1}.mp4`);
  const duration = clip.end - clip.start;

  if (duration <= 0) {
    console.warn(`  Skipping clip ${index + 1}: end must be greater than start.`);
    return null;
  }

  console.log(
    `  Cutting clip ${index + 1}: ${clip.start}s → ${clip.end}s  "${clip.title || clip.hook}"`
  );

  execFileSync(
    FFMPEG,
    [
      "-y",
      "-i", VIDEO_PATH,
      "-ss", String(clip.start),     // accurate seek after input
      "-t", String(duration),
      "-c:v", "libx264",
      "-c:a", "aac",
      "-preset", "fast",
      outPath,
    ],
    { stdio: "inherit" }
  );

  return outPath;
}

function cutAllClips(clips) {
  console.log(`\nCutting ${clips.length} clip(s)...`);
  const results = [];
  for (let i = 0; i < clips.length; i++) {
    const out = cutClip(clips[i], i);
    if (out) results.push(out);
  }
  return results;
}

// ── main ──────────────────────────────────────────────────────────────────────

function main() {
  const { url } = parseArgs();
  ensureDirs();

  const clips = loadClips();
  console.log(`Loaded ${clips.length} clip(s) from ${CLIPS_JSON}`);

  downloadVideo(url);
  const outputs = cutAllClips(clips);

  console.log(`\nDone. ${outputs.length} clip(s) saved to: ${ASSETS_DIR}`);
  outputs.forEach((f, i) => console.log(`  [${i + 1}] ${path.basename(f)}`));
}

main();
