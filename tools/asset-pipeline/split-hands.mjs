/**
 * One-off: split the two-hands "Creation of Adam" halftone source into two
 * separate, cleanly cut-out hands (transparent background, no halo box).
 *
 * Approach (robust to crop-rectangle guessing):
 *   1. Matte the cream background away with the shared imgly helper.
 *   2. Connected-components label the alpha mask. The fingertip GAP means the
 *      two hands are two separate blobs.
 *   3. Keep the TWO LARGEST blobs (drops grain specks + slivers), classify them
 *      by centroid into bottom-left / top-right.
 *   4. Per hand: isolate its pixels, erode the alpha by 1px to shave the bright
 *      matting fringe (the "thick stroke" we don't want), auto-crop to bbox with
 *      padding, and write a transparent WebP capped at ~1200px on the long edge.
 *
 * Run: node tools/asset-pipeline/split-hands.mjs
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import sharp from "sharp";

import { removeBackgroundToPng } from "./matte.mjs";

sharp.simd(false);

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

const SRC = join(__dirname, "sources", "hands-source.png");
const OUT_DIR = join(repoRoot, "public", "images", "about");
const OUT_BL = join(OUT_DIR, "hand-bottom-left.webp");
const OUT_TR = join(OUT_DIR, "hand-top-right.webp");

const ALPHA_THRESHOLD = 32; // mask membership
const MAX_EDGE = 1200;
const PAD_PCT = 6;

/** Iterative 8-connectivity connected-components labeling over a boolean mask. */
function labelComponents(mask, width, height) {
  const labels = new Int32Array(width * height).fill(0);
  const components = [];
  const stack = new Int32Array(width * height);
  let nextLabel = 0;

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] !== 0) continue;
    nextLabel++;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = nextLabel;

    let count = 0;
    let sumX = 0;
    let sumY = 0;

    while (sp > 0) {
      const idx = stack[--sp];
      const x = idx % width;
      const y = (idx - x) / width;
      count++;
      sumX += x;
      sumY += y;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const nIdx = ny * width + nx;
          if (mask[nIdx] && labels[nIdx] === 0) {
            labels[nIdx] = nextLabel;
            stack[sp++] = nIdx;
          }
        }
      }
    }

    components.push({
      label: nextLabel,
      count,
      cx: sumX / count,
      cy: sumY / count,
    });
  }

  return { labels, components };
}

/**
 * Build an RGBA raw buffer containing only the given component's pixels, with a
 * 1px alpha erosion to remove the matting fringe. Everything else is transparent.
 */
function isolateComponent(data, labels, width, height, label) {
  const out = Buffer.alloc(width * height * 4); // zero-filled = transparent
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (labels[idx] !== label) continue;

      // 1px erosion: drop edge pixels that border a non-component pixel. The
      // remaining boundary keeps the source's anti-aliased alpha, so edges stay
      // soft while the outermost bright fringe ring is shaved off.
      let isEdge = false;
      for (let dy = -1; dy <= 1 && !isEdge; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          isEdge = true;
          break;
        }
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width || labels[ny * width + nx] !== label) {
            isEdge = true;
            break;
          }
        }
      }
      if (isEdge) continue;

      const s = idx * 4;
      out[s] = data[s];
      out[s + 1] = data[s + 1];
      out[s + 2] = data[s + 2];
      out[s + 3] = data[s + 3];
    }
  }
  return out;
}

/** Alpha bbox computed directly from a raw RGBA buffer (alpha > threshold). */
function rawAlphaBBox(rawBuf, width, height, threshold = 16) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rawBuf[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

async function writeHand(rawBuf, width, height, outPath, padPct = PAD_PCT) {
  const bbox = rawAlphaBBox(rawBuf, width, height, 16);
  let pipeline = sharp(rawBuf, { raw: { width, height, channels: 4 } });
  if (bbox) {
    const padX = Math.round(((bbox.maxX - bbox.minX) * padPct) / 100);
    const padY = Math.round(((bbox.maxY - bbox.minY) * padPct) / 100);
    const left = Math.max(0, bbox.minX - padX);
    const top = Math.max(0, bbox.minY - padY);
    const right = Math.min(width - 1, bbox.maxX + padX);
    const bottom = Math.min(height - 1, bbox.maxY + padY);
    pipeline = pipeline.extract({
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
    });
  }
  const info = await pipeline
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, alphaQuality: 100 })
    .toFile(outPath);
  return info;
}

async function main() {
  console.log("Matting source…");
  const matted = await removeBackgroundToPng(SRC);

  const { data, info } = await sharp(matted)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  console.log(`Matted RGBA: ${width}x${height} (${channels}ch)`);

  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (data[i * channels + (channels - 1)] > ALPHA_THRESHOLD) mask[i] = 1;
  }

  const { labels, components } = labelComponents(mask, width, height);
  components.sort((a, b) => b.count - a.count);
  console.log(
    `Found ${components.length} components; top sizes:`,
    components.slice(0, 5).map((c) => c.count),
  );
  if (components.length < 2) {
    throw new Error("Expected at least two components (two hands).");
  }

  const [a, b] = components.slice(0, 2);
  // Lower-left hand has the smaller (x - y) score; upper-right the larger.
  const score = (c) => c.cx - c.cy;
  const bottomLeft = score(a) < score(b) ? a : b;
  const topRight = bottomLeft === a ? b : a;
  console.log(
    `bottom-left: label ${bottomLeft.label} centroid (${bottomLeft.cx.toFixed(0)}, ${bottomLeft.cy.toFixed(0)})`,
  );
  console.log(
    `top-right:   label ${topRight.label} centroid (${topRight.cx.toFixed(0)}, ${topRight.cy.toFixed(0)})`,
  );

  const blRaw = isolateComponent(data, labels, width, height, bottomLeft.label);
  const trRaw = isolateComponent(data, labels, width, height, topRight.label);

  const blInfo = await writeHand(blRaw, width, height, OUT_BL);
  const trInfo = await writeHand(trRaw, width, height, OUT_TR);

  console.log(
    `\nWrote ${OUT_BL}: ${blInfo.width}x${blInfo.height} (${blInfo.size} bytes)`,
  );
  console.log(
    `Wrote ${OUT_TR}: ${trInfo.width}x${trInfo.height} (${trInfo.size} bytes)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
