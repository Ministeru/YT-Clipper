#!/usr/bin/env node
/**
 * render.js — Renders vertical shorts via Remotion for specified clip indices.
 *
 * Usage (called by main.js or directly):
 *   node scripts/render.js 1
 *   node scripts/render.js 1 2 5
 *   node scripts/render.js 1-5
 *   node scripts/render.js all
 */

require("dotenv").config();
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const http = require("http");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const CLIPS_JSON = path.join(ROOT, "data", "clips.json");
const TRANSCRIPT_JSON = path.join(ROOT, "data", "transcript.json");
const ASSETS_DIR = path.join(ROOT, "assets");
const OUTPUTS_DIR = path.join(ROOT, "Outputs");

// ── helpers ───────────────────────────────────────────────────────────────────

function parseClipArgs(args) {
  if (!args.length) {
    console.error("Usage: node scripts/render.js <1 | 1 2 5 | 1-5 | all>");
    process.exit(1);
  }

  // "all" keyword
  if (args[0] === "all") return null; // null = render everything

  // Range: "1-5"
  if (args.length === 1 && args[0].includes("-")) {
    const [from, to] = args[0].split("-").map(Number);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }

  // Individual numbers: "1 2 5"
  return args.map(Number);
}

function loadData() {
  if (!fs.existsSync(CLIPS_JSON)) {
    console.error("Error: data/clips.json not found. Run clip selection first.");
    process.exit(1);
  }
  if (!fs.existsSync(TRANSCRIPT_JSON)) {
    console.error("Error: data/transcript.json not found. Run transcript fetch first.");
    process.exit(1);
  }
  const { clips } = JSON.parse(fs.readFileSync(CLIPS_JSON, "utf8"));
  const { transcript } = JSON.parse(fs.readFileSync(TRANSCRIPT_JSON, "utf8"));
  return { clips, transcript };
}

function getCaptionsForClip(transcript, start, end) {
  return transcript.filter((e) => e.start >= start - 0.5 && e.start <= end + 0.5);
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── local asset server ────────────────────────────────────────────────────────

function startAssetServer(dir, port = 0) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(dir, decodeURIComponent(req.url.replace(/\?.*$/, "")));

      let stat;
      try { stat = fs.statSync(filePath); } catch {
        res.writeHead(404); res.end(); return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mime = { ".mp4": "video/mp4", ".m4a": "audio/mp4", ".mp3": "audio/mpeg" }[ext] || "application/octet-stream";
      const total = stat.size;
      const rangeHeader = req.headers["range"];

      if (rangeHeader) {
        // Parse "bytes=start-end"
        const [, startStr, endStr] = rangeHeader.match(/bytes=(\d*)-(\d*)/) || [];
        const start = startStr ? parseInt(startStr, 10) : 0;
        const end = endStr ? parseInt(endStr, 10) : total - 1;
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          "Content-Type": mime,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Type": mime,
          "Accept-Ranges": "bytes",
          "Content-Length": total,
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });
    server.listen(port, "127.0.0.1", () => {
      const { port: assignedPort } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${assignedPort}` });
    });
  });
}

// ── render ────────────────────────────────────────────────────────────────────

async function renderClip(clip, index, bundled, baseUrl) {
  const slug = slugify(clip.title || `clip-${index}`);
  const videoFile = path.join(ASSETS_DIR, `clip-${index}.mp4`);
  const outputFile = path.join(OUTPUTS_DIR, `${index}-${slug}.mp4`);

  if (!fs.existsSync(videoFile)) {
    console.warn(`  ⚠ Skipping clip ${index}: ${videoFile} not found. Run extract first.`);
    return;
  }

  const clipDuration = clip.end - clip.start;
  const fps = 30;
  const durationInFrames = Math.round(clipDuration * fps);

  const captions = getCaptionsForClip(
    JSON.parse(fs.readFileSync(TRANSCRIPT_JSON, "utf8")).transcript,
    clip.start,
    clip.end
  );

  const musicSrc = fs.existsSync(path.join(ASSETS_DIR, "music.mp3"))
    ? `${baseUrl}/music.mp3`
    : null;

  const inputProps = {
    videoSrc: `${baseUrl}/clip-${index}.mp4`,
    captions,
    clipStart: clip.start,
    clipDuration,
    musicSrc,
  };

  console.log(`\n  Rendering clip ${index}: "${clip.title}" (${clipDuration}s → ${durationInFrames} frames)`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "VerticalShort",
    inputProps: { ...inputProps, durationInFrames },
  });

  await renderMedia({
    composition: { ...composition, durationInFrames },
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputFile,
    inputProps,
    imageFormat: "jpeg",
    onProgress: ({ progress }) => {
      process.stdout.write(`\r    ${Math.round(progress * 100)}%   `);
    },
  });

  console.log(`\n  ✅ Saved: ${outputFile}`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const indices = parseClipArgs(args);

  const { clips } = loadData();
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

  const toRender = indices
    ? indices.map((n) => ({ n, clip: clips[n - 1] })).filter(({ clip }) => clip != null)
    : clips.map((clip, i) => ({ n: i + 1, clip }));

  if (!toRender.length) {
    console.error("No valid clip indices found.");
    process.exit(1);
  }

  console.log(`\nStarting asset server...`);
  const { server, baseUrl } = await startAssetServer(ASSETS_DIR);
  console.log(`Asset server running at ${baseUrl}`);

  console.log(`\nBundling Remotion project...`);
  const bundled = await bundle({
    entryPoint: path.join(ROOT, "remotion", "index.js"),
    webpackOverride: (config) => config,
  });

  console.log(`\nRendering ${toRender.length} clip(s)...`);
  for (const { n, clip } of toRender) {
    await renderClip(clip, n, bundled, baseUrl);
  }

  server.close();
  console.log(`\n✅ Done. All renders saved to: ${OUTPUTS_DIR}`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
