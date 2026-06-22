#!/usr/bin/env node
/**
 * Grainy black-and-white HALFTONE "print" treatment for spin frames.
 *
 * Turns the COLOR per-frame WebPs of a spin asset into a baked, photocopied-zine
 * look: vintage tonal curve + classic AM halftone dots on a ~45° screen + film
 * grain. The ORIGINAL alpha (the matte cut-out) is preserved exactly, so the
 * object still floats over the dark page with a transparent background — no
 * opaque "paper" rectangle.
 *
 * It operates on the EXISTING frames in public/images/spin/<name>/frames/ (which
 * are already background-removed with correct alpha and identical geometry), so
 * it can run WITHOUT re-doing ffmpeg/matting. It writes a baked print sprite
 * `sprite-print.webp` packed with the SAME cols/rows/frame geometry as the color
 * sprite and adds a `spritePrint` field to manifest.json.
 *
 * Standalone usage (fast path, no video needed):
 *   node tools/spin-pipeline/treat.mjs --name cup-a
 *   node tools/spin-pipeline/treat.mjs --name cup-a --dot 6 --angle 45 --grain 0.14
 *
 * It is also imported by build.mjs so a single pipeline run emits BOTH the color
 * sprite and the baked print sprite.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

import sharp from "sharp";

sharp.simd(false);

// ---------------------------------------------------------------------------
// Treatment knobs — tasteful "vintage, slightly rough" defaults. Tune these
// (or pass the matching CLI flags) to retune the print look later.
// ---------------------------------------------------------------------------
export const PRINT_DEFAULTS = {
  // Halftone dot CELL size in SOURCE pixels. Frames are ~617x480 and scaled
  // down on screen, so ~4-8px reads as clearly "printed" but stays legible.
  dotCell: 6,
  // Screen rotation in degrees (classic black plate sits at 45deg).
  angleDeg: 45,
  // Dot-edge softness as a fraction of tonal range. A touch of softness makes
  // the dots feel like inked dots that bled into paper, not crisp vector dots.
  aa: 0.16,
  // Vintage tonal curve (applied to grayscale before screening):
  //   levels: remap [inBlack, inWhite] -> [0,1] (crush blacks / blow highlights)
  //   gamma : >1 lifts midtones (keeps detail so it isn't a black silhouette)
  //   contrast: punch around mid-grey
  inBlack: 0.1,
  inWhite: 0.92,
  gamma: 1.18,
  contrast: 1.28,
  // Roughness: grain jitter applied to the screen comparison (breaks up the
  // regular dot grid -> photocopied edges), plus a faint final luminance grain.
  grain: 0.16,
  finalGrain: 0.05,
  // Ink + paper tones. Slightly off pure black/white (crushed vintage range)
  // with a barely-there warm tint so it reads as aged print, not digital B&W.
  ink: { r: 26, g: 24, b: 22 },
  paper: { r: 240, g: 237, b: 231 },
};

function log(...m) {
  console.log("[treat]", ...m);
}

// Deterministic per-frame PRNG so re-runs are reproducible. Each frame gets an
// independent seed, which gives a lively "boiling" grain across the spin.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Build a 256-entry LUT mapping source luminance -> vintage-adjusted [0,1].
function buildToneLut(opts) {
  const { inBlack, inWhite, gamma, contrast } = opts;
  const span = Math.max(1e-4, inWhite - inBlack);
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    let v = i / 255;
    v = clamp01((v - inBlack) / span); // levels
    if (gamma !== 1) v = Math.pow(v, 1 / gamma); // midtone lift
    v = (v - 0.5) * contrast + 0.5; // contrast punch
    lut[i] = clamp01(v);
  }
  return lut;
}

/**
 * Apply the print treatment to a single frame.
 * @param {string|Buffer} input  Path or buffer of a (color, alpha-matted) frame.
 * @param {object} [opts]         Overrides for PRINT_DEFAULTS.
 * @returns {Promise<{data:Buffer,width:number,height:number}>} raw RGBA.
 * @param {number} [frameIndex]   Used to seed grain so it differs per frame.
 */
export async function treatFrameToRaw(input, opts = {}, frameIndex = 0) {
  const o = { ...PRINT_DEFAULTS, ...opts };
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const lut = buildToneLut(o);
  const rand = mulberry32(0x9e3779b9 ^ (frameIndex * 0x85ebca6b + 1));

  const theta = (o.angleDeg * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const cell = Math.max(2, o.dotCell);
  const HALF_DIAG = Math.SQRT1_2; // max center->corner distance in a unit cell
  const aa = Math.max(1e-3, o.aa);

  const { ink, paper } = o;
  const out = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * channels;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      const a = channels === 4 ? data[si + 3] : 255;

      // Luminance -> vintage tone.
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
      let tone = lut[lum];

      // Rotated halftone screen threshold (high at cell center, low at corners).
      const u = x * cos + y * sin;
      const v = -x * sin + y * cos;
      const pu = (((u % cell) + cell) % cell) / cell - 0.5;
      const pv = (((v % cell) + cell) % cell) / cell - 0.5;
      const dist = Math.sqrt(pu * pu + pv * pv) / HALF_DIAG;
      const threshold = clamp01(1 - dist);

      // Grain: jitter the tone before comparison so dot edges get rough.
      const jitter = (rand() - 0.5) * o.grain;
      const toneJ = tone + jitter;

      // coverage: 1 => full ink (dark), 0 => paper (light). Soft edge via aa.
      const coverage = clamp01((threshold - toneJ) / aa + 0.5);

      // Mix ink/paper, then a faint final luminance grain for tactility.
      const fg = (rand() - 0.5) * o.finalGrain * 255;
      const di = (y * width + x) * 4;
      out[di] = clamp255(paper.r + (ink.r - paper.r) * coverage + fg);
      out[di + 1] = clamp255(paper.g + (ink.g - paper.g) * coverage + fg);
      out[di + 2] = clamp255(paper.b + (ink.b - paper.b) * coverage + fg);
      out[di + 3] = a; // preserve the original matte alpha EXACTLY
    }
  }

  return { data: out, width, height };
}

function clamp255(v) {
  v = Math.round(v);
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Treat one frame and return a PNG buffer (handy for compositing/inspection). */
export async function treatFrameToPng(input, opts = {}, frameIndex = 0) {
  const { data, width, height } = await treatFrameToRaw(input, opts, frameIndex);
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * Build and write the baked print sprite for a spin asset, and add the
 * `spritePrint` field to its manifest.json.
 *
 * @param {object} args
 * @param {string} args.outDir   public/images/spin/<name>
 * @param {object} args.manifest Parsed manifest (frameCount, cols, rows, frame*).
 * @param {(string|Buffer)[]} args.frames  Per-frame inputs (paths or buffers),
 *        in frame order. Must match the color sprite geometry.
 * @param {object} [args.opts]   Treatment overrides.
 * @param {string} [args.spriteName] Output sprite filename (default sprite-print.webp).
 * @returns {Promise<string>} the spritePrint filename written.
 */
export async function buildPrintSprite({
  outDir,
  manifest,
  frames,
  opts = {},
  spriteName = "sprite-print.webp",
}) {
  const { cols, rows, frameWidth, frameHeight } = manifest;
  const composites = [];
  for (let i = 0; i < frames.length; i++) {
    const png = await treatFrameToPng(frames[i], opts, i);
    composites.push({
      input: png,
      left: (i % cols) * frameWidth,
      top: Math.floor(i / cols) * frameHeight,
    });
    log(`treat ${i + 1}/${frames.length}`);
  }

  const sprite = sharp({
    create: {
      width: cols * frameWidth,
      height: rows * frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  await sprite
    .composite(composites)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(outDir, spriteName));

  // Record the variant in the manifest so the player can opt into it.
  const manifestPath = join(outDir, "manifest.json");
  const onDisk = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : manifest;
  onDisk.spritePrint = spriteName;
  writeFileSync(manifestPath, JSON.stringify(onDisk, null, 2));

  return spriteName;
}

// ---------------------------------------------------------------------------
// Standalone CLI: treat the existing frames of an asset in place.
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function optsFromArgs(args) {
  const o = {};
  if (args.dot) o.dotCell = Number(args.dot);
  if (args.angle) o.angleDeg = Number(args.angle);
  if (args.aa) o.aa = Number(args.aa);
  if (args.grain) o.grain = Number(args.grain);
  if (args["final-grain"]) o.finalGrain = Number(args["final-grain"]);
  if (args.contrast) o.contrast = Number(args.contrast);
  if (args.gamma) o.gamma = Number(args.gamma);
  if (args["in-black"]) o.inBlack = Number(args["in-black"]);
  if (args["in-white"]) o.inWhite = Number(args["in-white"]);
  return o;
}

async function mainCli() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name) {
    console.error(
      `\nUsage: node tools/spin-pipeline/treat.mjs --name <name> [options]\n\n` +
        `Reads public/images/spin/<name>/frames/* + manifest.json, bakes a grainy\n` +
        `B&W halftone print sprite -> sprite-print.webp, and adds manifest.spritePrint.\n\n` +
        `Options (defaults in PRINT_DEFAULTS):\n` +
        `  --dot <px>          Halftone dot cell size in source px (default ${PRINT_DEFAULTS.dotCell}).\n` +
        `  --angle <deg>       Screen rotation (default ${PRINT_DEFAULTS.angleDeg}).\n` +
        `  --aa <frac>         Dot-edge softness (default ${PRINT_DEFAULTS.aa}).\n` +
        `  --grain <amt>       Screen grain/roughness 0..1 (default ${PRINT_DEFAULTS.grain}).\n` +
        `  --final-grain <amt> Final luminance grain 0..1 (default ${PRINT_DEFAULTS.finalGrain}).\n` +
        `  --contrast <x>      Contrast punch (default ${PRINT_DEFAULTS.contrast}).\n` +
        `  --gamma <x>         Midtone lift (default ${PRINT_DEFAULTS.gamma}).\n` +
        `  --in-black <0..1>   Levels black point (default ${PRINT_DEFAULTS.inBlack}).\n` +
        `  --in-white <0..1>   Levels white point (default ${PRINT_DEFAULTS.inWhite}).\n` +
        `  --out <dir>         Spin root (default public/images/spin).\n` +
        `  --sample <path>     Also write a single treated PNG sample for inspection.\n`
    );
    process.exit(1);
  }

  const name = String(args.name);
  const root = args.out ? resolve(String(args.out)) : resolve("public/images/spin");
  const outDir = join(root, name);
  const manifestPath = join(outDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`No manifest at ${manifestPath} — build the color asset first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const opts = optsFromArgs(args);

  const frames = [];
  for (let i = 0; i < manifest.frameCount; i++) {
    const p = join(outDir, "frames", `frame_${String(i).padStart(3, "0")}.webp`);
    if (!existsSync(p)) {
      console.error(`Missing frame ${p}. The frames/ dir is required (gitignored).`);
      process.exit(1);
    }
    frames.push(p);
  }

  log(
    `treating ${frames.length} frames of "${name}" — dot=${opts.dotCell ?? PRINT_DEFAULTS.dotCell}px ` +
      `angle=${opts.angleDeg ?? PRINT_DEFAULTS.angleDeg} grain=${opts.grain ?? PRINT_DEFAULTS.grain}`
  );

  if (args.sample) {
    const samplePath = resolve(String(args.sample));
    mkdirSync(resolve(samplePath, ".."), { recursive: true });
    const idx = manifest.settleFrame ?? 0;
    const png = await treatFrameToPng(frames[idx], opts, idx);
    writeFileSync(samplePath, png);
    log(`sample frame ${idx} -> ${samplePath}`);
  }

  const written = await buildPrintSprite({ outDir, manifest, frames, opts });
  log(`done -> ${join(outDir, written)} (manifest.spritePrint set)`);
}

// Only run the CLI when executed directly (not when imported by build.mjs).
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]).endsWith("treat.mjs");
if (invokedDirectly) {
  mainCli().catch((e) => {
    console.error("[treat] FAILED:", e.message);
    process.exit(1);
  });
}
