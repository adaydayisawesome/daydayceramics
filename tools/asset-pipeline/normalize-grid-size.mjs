#!/usr/bin/env node
/**
 * Normalize one piece's GRID size by adding transparent padding so its opaque
 * object fills a smaller fraction of the canvas, without re-matting.
 *
 * The collection grid renders every cell with `object-contain`, so a piece's
 * apparent size is driven by its object's bounding box relative to its canvas.
 * A piece whose matted assets crop tighter to the object (object fills more of
 * the canvas) renders LARGER than its neighbors. This tool composites the
 * EXISTING matted assets (the static `main.webp` and every COLOR spin frame)
 * onto a uniformly larger transparent canvas — same object pixels, centered,
 * just more breathing room — so the object-height fraction drops to a target.
 * It then re-packs `sprite.webp` (and the `sprite-print.webp` halftone variant,
 * the same way build.mjs does) and updates `manifest.json` frame geometry.
 *
 * Usage:
 *   node tools/asset-pipeline/normalize-grid-size.mjs \
 *     --main <path/to/main.webp> --spin <public/images/spin/<name>> --target <frac>
 *
 *   --target <frac>  Desired object-height / canvas-height fraction (e.g. 0.886).
 *   --main <path>    Static hero webp to pad (optional).
 *   --spin <dir>     Spin asset dir to pad + repack (optional).
 *   --dry-run        Measure + print the plan, write nothing.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { buildPrintSprite } from "../spin-pipeline/treat.mjs";

sharp.simd(false);

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const k = t.slice(2);
    const n = argv[i + 1];
    if (n === undefined || n.startsWith("--")) a[k] = true;
    else {
      a[k] = n;
      i++;
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const TARGET = args.target ? Number(args.target) : null;
const MAIN = args.main ? String(args.main) : null;
const SPIN = args.spin ? String(args.spin) : null;
const DRY = Boolean(args["dry-run"]);

if (!TARGET || (!MAIN && !SPIN)) {
  console.error(
    "Usage: normalize-grid-size.mjs --target <frac> [--main <webp>] [--spin <dir>] [--dry-run]"
  );
  process.exit(1);
}

/** Opaque bounding box of an RGBA image buffer/path. */
async function bbox(input, threshold = 16) {
  const { data, info } = await sharp(input)
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
      const al = data[(y * width + x) * channels + (channels - 1)];
      if (al > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { width, height, bh: maxY - minY + 1, bw: maxX - minX + 1 };
}

/** Composite `input` centered onto a transparent canvas scaled up by `scale`. */
async function padUniform(input, curW, curH, scale) {
  const newW = Math.round(curW * scale);
  const newH = Math.round(curH * scale);
  const base = sharp({
    create: {
      width: newW,
      height: newH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const buf = await base
    .composite([
      {
        input: await sharp(input).ensureAlpha().png().toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toBuffer();
  return { buf, newW, newH };
}

async function normalizeMain() {
  const b = await bbox(MAIN);
  if (!b) return console.error(`main: ${MAIN} fully transparent`);
  const curFrac = b.bh / b.height;
  const scale = curFrac / TARGET;
  console.log(
    `main: canvas ${b.width}x${b.height} objH ${b.bh} hFrac ${curFrac.toFixed(
      4
    )} -> scale ${scale.toFixed(4)} (target ${TARGET})`
  );
  if (scale <= 1) {
    console.log("  main already <= target; leaving unchanged.");
    return;
  }
  const { buf, newW, newH } = await padUniform(MAIN, b.width, b.height, scale);
  if (DRY) {
    console.log(`  would write ${MAIN} as ${newW}x${newH}`);
    return;
  }
  await sharp(buf).webp({ quality: 82, alphaQuality: 100 }).toFile(MAIN);
  const after = await bbox(MAIN);
  console.log(
    `  wrote ${MAIN} -> ${newW}x${newH}, new hFrac ${(
      after.bh / after.height
    ).toFixed(4)}`
  );
}

async function normalizeSpin() {
  const manifestPath = join(SPIN, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const framesDir = join(SPIN, "frames");
  const frameFiles = readdirSync(framesDir)
    .filter((f) => f.endsWith(".webp"))
    .sort();
  if (frameFiles.length !== manifest.frameCount) {
    console.warn(
      `spin: ${frameFiles.length} frame files but manifest.frameCount=${manifest.frameCount}`
    );
  }

  // Measure current mean object-height fraction across frames.
  let sum = 0,
    n = 0,
    curW = manifest.frameWidth,
    curH = manifest.frameHeight;
  for (const f of frameFiles) {
    const b = await bbox(join(framesDir, f));
    if (!b) continue;
    curW = b.width;
    curH = b.height;
    sum += b.bh / b.height;
    n++;
  }
  const meanFrac = sum / n;
  const scale = meanFrac / TARGET;
  console.log(
    `spin: ${n} frames ${curW}x${curH} mean hFrac ${meanFrac.toFixed(
      4
    )} -> scale ${scale.toFixed(4)} (target ${TARGET})`
  );
  if (scale <= 1) {
    console.log("  spin already <= target; leaving unchanged.");
    return;
  }

  const newW = Math.round(curW * scale);
  const newH = Math.round(curH * scale);
  console.log(`  new frame geometry ${newW}x${newH}`);
  if (DRY) {
    console.log("  (dry run) would re-pad frames + repack sprites + manifest.");
    return;
  }

  // Pad every frame uniformly, overwrite frames/, collect color buffers.
  const colorBuffers = [];
  let measSum = 0;
  for (const f of frameFiles) {
    const p = join(framesDir, f);
    const { buf } = await padUniform(p, curW, curH, scale);
    const webp = await sharp(buf)
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer();
    writeFileSync(p, webp);
    colorBuffers.push(webp);
    const b = await bbox(webp);
    measSum += b.bh / b.height;
  }
  console.log(`  re-padded frames; new mean hFrac ${(measSum / frameFiles.length).toFixed(4)}`);

  // Update manifest geometry (cols/rows/frameCount unchanged).
  manifest.frameWidth = newW;
  manifest.frameHeight = newH;

  // Re-pack the COLOR sprite exactly like build.mjs.
  const { cols, rows } = manifest;
  const composites = [];
  for (let i = 0; i < colorBuffers.length; i++) {
    composites.push({
      input: await sharp(colorBuffers[i]).png().toBuffer(),
      left: (i % cols) * newW,
      top: Math.floor(i / cols) * newH,
    });
  }
  await sharp({
    create: {
      width: cols * newW,
      height: rows * newH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(join(SPIN, "sprite.webp"));
  console.log(`  wrote sprite.webp (${cols * newW}x${rows * newH})`);

  // Persist manifest BEFORE the print pass (buildPrintSprite re-reads + adds spritePrint).
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Re-bake the print sprite from the padded color frames (same geometry).
  await buildPrintSprite({ outDir: SPIN, manifest, frames: colorBuffers });
  console.log("  re-baked sprite-print.webp");
}

if (MAIN) await normalizeMain();
if (SPIN) await normalizeSpin();
console.log("done.");
