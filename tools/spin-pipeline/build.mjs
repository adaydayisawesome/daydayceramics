#!/usr/bin/env node
/**
 * Turntable video -> web "360 spinner" assets.
 *
 * Pipeline:
 *   1. Extract N frames from a turntable video (ffmpeg).
 *   2. Remove the background of each frame to transparency (swappable matter:
 *      `imgly` Node lib, `rembg` Python CLI, or `none`).
 *   3. Auto-crop to a SINGLE union bounding box (consistent across frames so the
 *      object does not jitter), then emit a numbered transparent WebP sequence,
 *      a packed WebP sprite sheet, and a manifest.json.
 *
 * Output: public/images/spin/<name>/
 *   - frames/frame_000.webp ... frame_NNN.webp
 *   - sprite.webp        (full COLOR sprite — product/collection pages use it)
 *   - sprite-print.webp  (baked grainy B&W halftone "print" — HOME spinner)
 *   - manifest.json      (includes `spritePrint` when the print variant exists)
 *
 * The print treatment lives in ./treat.mjs and can also be run standalone over
 * an EXISTING asset's frames (no video/ffmpeg/matting needed):
 *   node tools/spin-pipeline/treat.mjs --name cup-a
 *
 * Usage:
 *   node tools/spin-pipeline/build.mjs --input ~/Downloads/cup.mov --name cup-a --frames 36
 *
 * See README.md in this directory for full options and the bg-removal caveats.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import os from "node:os";

import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

import { buildPrintSprite } from "./treat.mjs";

// Sharp logs harmless SIMD capability warnings on some CPUs; silence them.
sharp.simd(false);

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.input || !args.name) {
  console.error(
    `\nUsage: node tools/spin-pipeline/build.mjs --input <video> --name <name> [options]\n\n` +
      `Required:\n` +
      `  --input <path>     Source turntable video (mp4/mov/...).\n` +
      `  --name <name>      Asset name -> public/images/spin/<name>/.\n\n` +
      `Options:\n` +
      `  --frames <N>       Number of frames to sample (default 36).\n` +
      `  --fps <rate>       Sample at a fixed fps instead of N evenly-spaced frames.\n` +
      `  --start <sec>      Trim: start time in seconds (default 0).\n` +
      `  --end <sec>        Trim: end time in seconds (default = clip end).\n` +
      `  --matte <mode>     Background removal: imgly | rembg | none (default imgly).\n` +
      `  --max <px>         Max frame height; downscale to fit (default 480).\n` +
      `  --pad <pct>        Padding added around the union bbox (default 4).\n` +
      `  --cols <n>         Sprite-sheet columns (default ceil(sqrt(frames))).\n` +
      `  --turns <n>        Physical rotations captured in the clip (manifest only, default 1).\n` +
      `  --settle <i>       Default settle/front frame index (manifest only, default 0).\n` +
      `  --out <dir>        Output root (default public/images/spin).\n` +
      `  --keep-tmp         Keep the intermediate working directory.\n`
  );
  process.exit(1);
}

const INPUT = resolve(String(args.input).replace(/^~/, os.homedir()));
const NAME = String(args.name);
const FRAMES = args.frames ? parseInt(args.frames, 10) : 36;
const FPS = args.fps ? Number(args.fps) : null;
const START = args.start ? Number(args.start) : 0;
const END = args.end ? Number(args.end) : null;
const MATTE = args.matte ? String(args.matte) : "imgly";
const MAX_H = args.max ? parseInt(args.max, 10) : 480;
const PAD_PCT = args.pad ? Number(args.pad) : 4;
const TURNS = args.turns ? Number(args.turns) : 1;
const SETTLE = args.settle ? parseInt(args.settle, 10) : 0;
const OUT_ROOT = args.out
  ? resolve(String(args.out))
  : resolve("public/images/spin");
const KEEP_TMP = Boolean(args["keep-tmp"]);

if (!existsSync(INPUT)) {
  console.error(`Input video not found: ${INPUT}`);
  process.exit(1);
}

const OUT_DIR = join(OUT_ROOT, NAME);
const FRAMES_DIR = join(OUT_DIR, "frames");
const TMP_DIR = join(os.tmpdir(), `spin-pipeline-${NAME}-${Date.now()}`);
const TMP_RAW = join(TMP_DIR, "raw");
const TMP_MATTE = join(TMP_DIR, "matte");

function log(...m) {
  console.log("[spin]", ...m);
}

// ---------------------------------------------------------------------------
// 1. Probe + extract frames
// ---------------------------------------------------------------------------
function probeDuration() {
  const out = execFileSync(ffprobe.path, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    INPUT,
  ]);
  const j = JSON.parse(out.toString());
  const v = j.streams.find((s) => s.codec_type === "video");
  return {
    duration: Number(j.format.duration),
    width: v.width,
    height: v.height,
  };
}

function extractFrames() {
  mkdirSync(TMP_RAW, { recursive: true });
  const trim = [];
  if (START) trim.push("-ss", String(START));
  if (END != null) trim.push("-to", String(END));

  if (FPS) {
    // Fixed-rate sampling.
    execFileSync(ffmpegPath, [
      "-y",
      ...trim,
      "-i",
      INPUT,
      "-vf",
      `fps=${FPS}`,
      join(TMP_RAW, "raw_%04d.png"),
    ]);
    return readdirSync(TMP_RAW)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => join(TMP_RAW, f));
  }

  // Default: extract every source frame in range, then pick N evenly so the
  // object is sampled uniformly around the turntable regardless of source fps.
  execFileSync(ffmpegPath, [
    "-y",
    ...trim,
    "-i",
    INPUT,
    join(TMP_RAW, "raw_%04d.png"),
  ]);
  const all = readdirSync(TMP_RAW)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => join(TMP_RAW, f));

  if (all.length <= FRAMES) return all;
  const picked = [];
  for (let i = 0; i < FRAMES; i++) {
    const idx = Math.round((i * (all.length - 1)) / (FRAMES - 1));
    picked.push(all[idx]);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// 2. Background removal (swappable)
// ---------------------------------------------------------------------------
async function matteImgly(srcPaths) {
  let removeBackground;
  try {
    ({ removeBackground } = await import("@imgly/background-removal-node"));
  } catch (e) {
    throw new Error(
      "Matte mode 'imgly' requires @imgly/background-removal-node.\n" +
        "Install it (network required): npm install -D @imgly/background-removal-node\n" +
        `Original error: ${e.message}`
    );
  }
  mkdirSync(TMP_MATTE, { recursive: true });
  const out = [];
  for (let i = 0; i < srcPaths.length; i++) {
    const src = srcPaths[i];
    // The Node build accepts a file path/URL; the model downloads on first run.
    const blob = await removeBackground(src);
    const buf = Buffer.from(await blob.arrayBuffer());
    const dst = join(TMP_MATTE, `m_${String(i).padStart(4, "0")}.png`);
    writeFileSync(dst, buf);
    out.push(dst);
    log(`matte imgly ${i + 1}/${srcPaths.length}`);
  }
  return out;
}

function matteRembg(srcPaths) {
  mkdirSync(TMP_MATTE, { recursive: true });
  const out = [];
  for (let i = 0; i < srcPaths.length; i++) {
    const src = srcPaths[i];
    const dst = join(TMP_MATTE, `m_${String(i).padStart(4, "0")}.png`);
    execFileSync("rembg", ["i", src, dst], { stdio: "inherit" });
    out.push(dst);
    log(`matte rembg ${i + 1}/${srcPaths.length}`);
  }
  return out;
}

async function matteNone(srcPaths) {
  // No background removal: just ensure an alpha channel exists so the rest of
  // the pipeline (alpha bbox) still works. Useful for offline smoke tests.
  mkdirSync(TMP_MATTE, { recursive: true });
  const out = [];
  for (let i = 0; i < srcPaths.length; i++) {
    const dst = join(TMP_MATTE, `m_${String(i).padStart(4, "0")}.png`);
    await sharp(srcPaths[i]).ensureAlpha().png().toFile(dst);
    out.push(dst);
  }
  return out;
}

async function matte(srcPaths) {
  if (MATTE === "none") return matteNone(srcPaths);
  if (MATTE === "rembg") return matteRembg(srcPaths);
  return matteImgly(srcPaths);
}

// ---------------------------------------------------------------------------
// 3. Union bbox -> crop -> sequence + sprite + manifest
// ---------------------------------------------------------------------------
async function alphaBBox(path, threshold = 16) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + (channels - 1)];
      if (a > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY, width, height };
}

async function build() {
  log(`input: ${INPUT}`);
  const meta = probeDuration();
  log(
    `video: ${meta.width}x${meta.height}, ${meta.duration.toFixed(2)}s; matte=${MATTE}`
  );

  log("extracting frames...");
  const raw = extractFrames();
  log(`extracted ${raw.length} frames`);

  log("removing backgrounds...");
  const matted = await matte(raw);

  log("computing union bounding box...");
  const boxes = [];
  for (const p of matted) {
    const b = await alphaBBox(p);
    if (b) boxes.push(b);
  }
  if (!boxes.length) throw new Error("No opaque pixels found after matting.");
  const canvasW = boxes[0].width;
  const canvasH = boxes[0].height;
  let minX = Math.min(...boxes.map((b) => b.minX));
  let minY = Math.min(...boxes.map((b) => b.minY));
  let maxX = Math.max(...boxes.map((b) => b.maxX));
  let maxY = Math.max(...boxes.map((b) => b.maxY));
  // Padding around the union box.
  const padX = Math.round(((maxX - minX) * PAD_PCT) / 100);
  const padY = Math.round(((maxY - minY) * PAD_PCT) / 100);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(canvasW - 1, maxX + padX);
  maxY = Math.min(canvasH - 1, maxY + padY);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  log(`union bbox: ${cropW}x${cropH} at (${minX},${minY})`);

  // Consistent output frame size (optionally downscaled to MAX_H).
  const scale = cropH > MAX_H ? MAX_H / cropH : 1;
  const frameW = Math.round(cropW * scale);
  const frameH = Math.round(cropH * scale);

  // Reset output dir.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(FRAMES_DIR, { recursive: true });

  log("cropping + writing WebP sequence...");
  const frameBuffers = [];
  for (let i = 0; i < matted.length; i++) {
    const buf = await sharp(matted[i])
      .ensureAlpha()
      .extract({ left: minX, top: minY, width: cropW, height: cropH })
      .resize(frameW, frameH)
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer();
    frameBuffers.push(buf);
    writeFileSync(
      join(FRAMES_DIR, `frame_${String(i).padStart(3, "0")}.webp`),
      buf
    );
  }
  const frameCount = frameBuffers.length;

  log("packing sprite sheet...");
  const cols = args.cols
    ? parseInt(args.cols, 10)
    : Math.ceil(Math.sqrt(frameCount));
  const rows = Math.ceil(frameCount / cols);
  const sprite = sharp({
    create: {
      width: cols * frameW,
      height: rows * frameH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const composites = [];
  for (let i = 0; i < frameCount; i++) {
    composites.push({
      input: await sharp(matted[i])
        .ensureAlpha()
        .extract({ left: minX, top: minY, width: cropW, height: cropH })
        .resize(frameW, frameH)
        .png()
        .toBuffer(),
      left: (i % cols) * frameW,
      top: Math.floor(i / cols) * frameH,
    });
  }
  await sprite
    .composite(composites)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(OUT_DIR, "sprite.webp"));

  const manifest = {
    name: NAME,
    source: basename(INPUT),
    createdAt: new Date().toISOString(),
    frameCount,
    frameWidth: frameW,
    frameHeight: frameH,
    cols,
    rows,
    sprite: "sprite.webp",
    sequence: "frames/frame_%03d.webp",
    turns: TURNS,
    settleFrame: SETTLE,
  };
  writeFileSync(
    join(OUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  // Bake the grainy B&W halftone "print" variant used by the HOME spinner.
  // The COLOR sprite above stays untouched (product/collection pages reuse it);
  // this adds sprite-print.webp + manifest.spritePrint. The treated frames
  // reuse the freshly-cropped color frame buffers (identical geometry), so this
  // needs no extra ffmpeg/matting work.
  log("baking print (halftone) sprite...");
  await buildPrintSprite({
    outDir: OUT_DIR,
    manifest,
    frames: frameBuffers,
  });

  if (!KEEP_TMP) rmSync(TMP_DIR, { recursive: true, force: true });

  log(`done -> ${OUT_DIR}`);
  log(
    `  ${frameCount} frames @ ${frameW}x${frameH}, sprite ${cols}x${rows}, settleFrame=${SETTLE}`
  );
}

build().catch((e) => {
  console.error("[spin] FAILED:", e.message);
  process.exit(1);
});
