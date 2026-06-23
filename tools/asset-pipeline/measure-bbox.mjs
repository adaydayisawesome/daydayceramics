#!/usr/bin/env node
/**
 * Throwaway diagnostic: report the opaque object's bounding-box height as a
 * fraction of the image (canvas) height for one or more transparent WebPs,
 * and (for spin dirs) across every frame. Used to normalize a piece's grid
 * size to match another piece under the grid's object-contain.
 *
 *   node tools/asset-pipeline/measure-bbox.mjs <file-or-spindir> [...]
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

sharp.simd(false);

async function bbox(input, threshold = 16) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1;
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
  return {
    width,
    height,
    bw: maxX - minX + 1,
    bh: maxY - minY + 1,
    hFrac: (maxY - minY + 1) / height,
    wFrac: (maxX - minX + 1) / width,
  };
}

async function measureFile(p) {
  const b = await bbox(p);
  if (!b) return console.log(`${p}: (fully transparent)`);
  console.log(
    `${p}: canvas ${b.width}x${b.height} | obj ${b.bw}x${b.bh} | hFrac ${b.hFrac.toFixed(
      4
    )} | wFrac ${b.wFrac.toFixed(4)}`
  );
}

async function measureSpin(dir) {
  const framesDir = join(dir, "frames");
  const frames = readdirSync(framesDir)
    .filter((f) => f.endsWith(".webp"))
    .sort();
  let maxH = 0, minH = 1, sum = 0, n = 0, frame0 = 0;
  for (const f of frames) {
    const b = await bbox(join(framesDir, f));
    if (!b) continue;
    if (n === 0) frame0 = b.hFrac;
    maxH = Math.max(maxH, b.hFrac);
    minH = Math.min(minH, b.hFrac);
    sum += b.hFrac;
    n++;
  }
  console.log(
    `${dir} [frames=${n}] hFrac min ${minH.toFixed(4)} | max ${maxH.toFixed(
      4
    )} | mean ${(sum / n).toFixed(4)} | frame0 ${frame0.toFixed(4)}`
  );
}

const targets = process.argv.slice(2);
for (const t of targets) {
  if (!existsSync(t)) {
    console.log(`${t}: MISSING`);
    continue;
  }
  if (statSync(t).isDirectory()) await measureSpin(t);
  else await measureFile(t);
}
