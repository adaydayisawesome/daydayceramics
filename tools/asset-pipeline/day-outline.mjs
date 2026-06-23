#!/usr/bin/env node
/**
 * Derive the V2 home "DAY" assets from the hand-drawn source.
 *
 * Input : tools/asset-pipeline/sources/day-handdrawn.png
 *         (black hand-drawn OUTLINE "DAY" on a cream background)
 *
 * Output (public/images/home-v2/, SAME canvas size/registration so they
 *         overlay in place):
 *   day-outline.webp      — strokes kept, cream keyed to transparent. The soft
 *                           alpha key is ERODED ~1px so the hand-drawn stroke
 *                           reads a touch thinner while keeping its wobble + AA.
 *   day-fill-marker.webp  — a neon-green (#03F94D) hand-drawn MARKER SCRIBBLE
 *                           fill, masked to the letter silhouette so the green
 *                           only appears inside the letters and the counters
 *                           (the hole in "D", the triangle in "A") stay open.
 *
 * The silhouette / fill mask uses an even-odd / nesting-depth rule:
 *   depth 0 = exterior background      -> transparent
 *   depth 1 = letter body              -> filled
 *   depth 2 = counter (enclosed hole)  -> transparent
 * implemented by sealing the strokes (dilate), flooding the exterior from the
 * border, then flooding the BODY inward from the pixels one stroke-band away
 * from the exterior. Anything enclosed but never reached is a counter. The
 * marker scribble is built as a seeded SVG of many translucent green zigzag
 * strokes, rasterized, then masked (dest-in) to `ink ∪ body`.
 *
 * Run: node tools/asset-pipeline/day-outline.mjs
 */
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "sources", "day-handdrawn.png");
const OUT_DIR = path.join(here, "..", "..", "public", "images", "home-v2");

// Long edge of the working/output canvas.
const LONG_EDGE = 1400;

// Outline alpha key (luma 0..255): cream -> transparent, ink -> opaque, with a
// soft ramp in between so the wobbly strokes keep their anti-aliasing.
const KEY_DARK = 95; // luma <= this is fully opaque ink
const KEY_LIGHT = 205; // luma >= this is fully transparent (cream)

// Thin the outline: erode the soft alpha key by this radius (px). The min-filter
// shifts each stroke edge inward ~r px (so ~2r thinner overall) while preserving
// the wobble + anti-aliasing. Tune by eye — 1 reads clearly thinner, not dotted.
const OUTLINE_ERODE_RADIUS = 1;

// Fill pipeline tuning.
const INK_LUMA = 140; // luma < this counts as a drawn stroke
const SEAL_RADIUS = 3; // dilate strokes to close hand-drawn gaps
const BODY_REACH = 16; // how far the body grows in from the exterior stroke band

// Neon-green marker fill tuning.
const MARKER_GREEN = "#03F94D";
const MARKER_GREEN_RGB = [0x03, 0xf9, 0x4d];
const MARKER_BASE_ALPHA = 60; // faint green floor so letters read as filled
const MARKER_SEED = 0x0da1da1; // fixed RNG seed -> reproducible scribble
const MARKER_BAND_H = 210; // height of each horizontal scribble band (px)
const MARKER_BAND_STEP = 0.82; // band advance as a fraction of band height
const MARKER_PASSES = 2; // overlapping zigzag passes per band (density)
const MARKER_STEP = 27; // horizontal advance per zigzag vertex (px)

function luma(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Square-kernel morphological dilation (separable max filter), radius r. */
function dilate(mask, w, h, r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  // horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let on = 0;
      for (let dx = -r; dx <= r && !on; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < w && mask[row + xx]) on = 1;
      }
      tmp[row + x] = on;
    }
  }
  // vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let on = 0;
      for (let dy = -r; dy <= r && !on; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < h && tmp[yy * w + x]) on = 1;
      }
      out[y * w + x] = on;
    }
  }
  return out;
}

/**
 * Square-kernel grayscale erosion (separable MIN filter), radius r. Mirrors
 * `dilate` but takes the min, so it pulls stroke edges inward and thins them
 * while keeping the soft anti-aliased ramp. Operates on 0..255 alpha.
 */
function erode(alpha, w, h, r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  // horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let m = 255;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        const v = xx >= 0 && xx < w ? alpha[row + xx] : 0;
        if (v < m) m = v;
      }
      tmp[row + x] = m;
    }
  }
  // vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 255;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        const v = yy >= 0 && yy < h ? tmp[yy * w + x] : 0;
        if (v < m) m = v;
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

/** Deterministic PRNG (mulberry32) so the marker scribble is reproducible. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build an SVG of many translucent green zigzag strokes covering the canvas —
 * mostly-vertical back-and-forth marker scribbles, swept in overlapping
 * horizontal bands with positional jitter, varied widths and opacity so the
 * density builds up unevenly like a real marker. Clipped later to the letters.
 */
function buildMarkerSvg(w, h) {
  const rng = mulberry32(MARKER_SEED);
  const jitter = (amp) => (rng() - 0.5) * 2 * amp;
  const paths = [];

  for (
    let top = -MARKER_BAND_H * 0.35;
    top < h;
    top += MARKER_BAND_H * MARKER_BAND_STEP
  ) {
    const bandTop = top;
    const bandBot = top + MARKER_BAND_H;
    for (let p = 0; p < MARKER_PASSES; p++) {
      const width = 13 + rng() * 13; // marker tip 13..26 px
      const opacity = 0.34 + rng() * 0.28; // 0.34..0.62 -> uneven buildup
      const phase = p * (MARKER_STEP / MARKER_PASSES) + jitter(5);
      const pts = [];
      let down = rng() > 0.5;
      for (let x = -30 + phase; x <= w + 30; x += MARKER_STEP + jitter(7)) {
        // Alternate between the band's top and bottom -> steep (near vertical)
        // zigzag. Jitter both axes (the bottom/top overshoot varies a lot) so
        // the scribble wobbles and under/over-fills like a real hand.
        const y = (down ? bandBot : bandTop) + jitter(34);
        pts.push(`${(x + jitter(9)).toFixed(1)},${y.toFixed(1)}`);
        down = !down;
      }
      paths.push(
        `<polyline points="${pts.join(" ")}" fill="none" ` +
          `stroke="${MARKER_GREEN}" stroke-width="${width.toFixed(1)}" ` +
          `stroke-opacity="${opacity.toFixed(3)}" ` +
          `stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}">${paths.join("")}</svg>`
  );
}

/** Flood fill over `passable` (1 = can travel) starting from all seed pixels. */
function flood(passable, seeds, w, h) {
  const filled = new Uint8Array(w * h);
  const stack = [];
  for (const i of seeds) {
    if (passable[i] && !filled[i]) {
      filled[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) {
      const j = i - 1;
      if (passable[j] && !filled[j]) (filled[j] = 1), stack.push(j);
    }
    if (x < w - 1) {
      const j = i + 1;
      if (passable[j] && !filled[j]) (filled[j] = 1), stack.push(j);
    }
    if (y > 0) {
      const j = i - w;
      if (passable[j] && !filled[j]) (filled[j] = 1), stack.push(j);
    }
    if (y < h - 1) {
      const j = i + w;
      if (passable[j] && !filled[j]) (filled[j] = 1), stack.push(j);
    }
  }
  return filled;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const { data, info } = await sharp(SRC)
    .resize(LONG_EDGE, LONG_EDGE, { fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: w, height: h, channels } = info;
  const n = w * h;

  // Per-pixel luma + the two derived masks.
  const lum = new Float32Array(n);
  const ink = new Uint8Array(n);
  const outlineAlpha = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const o = i * channels;
    const L = luma(data[o], data[o + 1], data[o + 2]);
    lum[i] = L;
    ink[i] = L < INK_LUMA ? 1 : 0;
    // Soft alpha key for the outline (dark -> 255, cream -> 0).
    let a;
    if (L <= KEY_DARK) a = 255;
    else if (L >= KEY_LIGHT) a = 0;
    else a = Math.round(255 * (1 - (L - KEY_DARK) / (KEY_LIGHT - KEY_DARK)));
    outlineAlpha[i] = a;
  }

  // ---- day-outline.webp: thinned strokes, cream keyed out. ----
  // Erode the soft alpha so the stroke reads a touch thinner (wobble + AA kept).
  const outlineThin = erode(outlineAlpha, w, h, OUTLINE_ERODE_RADIUS);
  const outlineBuf = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const o = i * channels;
    // Keep the original (near-black) stroke color for natural anti-aliasing.
    outlineBuf[i * 4] = data[o];
    outlineBuf[i * 4 + 1] = data[o + 1];
    outlineBuf[i * 4 + 2] = data[o + 2];
    outlineBuf[i * 4 + 3] = outlineThin[i];
  }

  // ---- fill silhouette: even-odd nesting (ink ∪ body, counters open). ----
  const sealed = dilate(ink, w, h, SEAL_RADIUS); // close stroke gaps
  const nonInk = new Uint8Array(n);
  for (let i = 0; i < n; i++) nonInk[i] = sealed[i] ? 0 : 1;

  // Exterior = non-ink reachable from the border (depth 0).
  const borderSeeds = [];
  for (let x = 0; x < w; x++) {
    borderSeeds.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    borderSeeds.push(y * w, y * w + (w - 1));
  }
  const exterior = flood(nonInk, borderSeeds, w, h);

  // Body (depth 1) = enclosed non-ink reachable from one stroke-band in from
  // the exterior. Seed it from the enclosed pixels covered by a dilated
  // exterior, then flood inward across enclosed pixels only.
  const exteriorNear = dilate(exterior, w, h, SEAL_RADIUS + BODY_REACH);
  const enclosed = new Uint8Array(n);
  for (let i = 0; i < n; i++) enclosed[i] = nonInk[i] && !exterior[i] ? 1 : 0;

  const bodySeeds = [];
  for (let i = 0; i < n; i++) {
    if (enclosed[i] && exteriorNear[i]) bodySeeds.push(i);
  }
  const body = flood(enclosed, bodySeeds, w, h);

  // Silhouette alpha = ink strokes + body. Counters (enclosed but not body)
  // stay transparent. The body flood stops one SEAL_RADIUS band short of the
  // real strokes, so grow it back toward the ink to close that interior gap —
  // clipped to the REAL (un-sealed) exterior so the green can't spill past the
  // stroke onto the cream, and excluding counters so the holes stay open.
  const counterMask = new Uint8Array(n);
  let counterPixels = 0;
  for (let i = 0; i < n; i++) {
    if (enclosed[i] && !body[i]) {
      counterMask[i] = 1;
      counterPixels++;
    }
  }
  const realNonInk = new Uint8Array(n);
  for (let i = 0; i < n; i++) realNonInk[i] = ink[i] ? 0 : 1;
  const realExterior = flood(realNonInk, borderSeeds, w, h);
  const grownBody = dilate(body, w, h, SEAL_RADIUS + 2);

  // Outer edge AA comes from the outline key; erode by the same radius as the
  // outline so the green stays inside the thinned stroke, and the dark outline
  // (drawn on top) hides the seam.
  const maskFull = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const solid =
      (ink[i] || grownBody[i]) && !realExterior[i] && !counterMask[i] ? 255 : 0;
    maskFull[i] = Math.max(solid, outlineAlpha[i]);
  }
  const maskAlpha = erode(maskFull, w, h, OUTLINE_ERODE_RADIUS);

  // ---- day-fill-marker.webp: neon-green marker scribble, clipped to letters.
  const svg = buildMarkerSvg(w, h);
  const scribble = await sharp(Buffer.from(svg))
    .resize(w, h)
    .ensureAlpha()
    .raw()
    .toBuffer();
  const markerBuf = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    // Bake the green everywhere (avoids dark fringing at translucent AA edges).
    markerBuf[o] = MARKER_GREEN_RGB[0];
    markerBuf[o + 1] = MARKER_GREEN_RGB[1];
    markerBuf[o + 2] = MARKER_GREEN_RGB[2];
    // Floor the scribble with a faint base so each letter reads as filled, then
    // dest-in: keep it only where the letter silhouette is opaque.
    const green = Math.max(scribble[o + 3], MARKER_BASE_ALPHA);
    markerBuf[o + 3] = Math.round((green * maskAlpha[i]) / 255);
  }

  const webp = { quality: 85, alphaQuality: 100 };
  await sharp(outlineBuf, { raw: { width: w, height: h, channels: 4 } })
    .webp(webp)
    .toFile(path.join(OUT_DIR, "day-outline.webp"));
  await sharp(markerBuf, { raw: { width: w, height: h, channels: 4 } })
    .webp(webp)
    .toFile(path.join(OUT_DIR, "day-fill-marker.webp"));

  console.log(`canvas ${w}x${h}`);
  console.log(`counter (transparent enclosed) pixels: ${counterPixels}`);
  console.log(`outline erode radius: ${OUTLINE_ERODE_RADIUS}px`);
  console.log(`marker seed: ${MARKER_SEED}`);
  console.log(`wrote ${path.join(OUT_DIR, "day-outline.webp")}`);
  console.log(`wrote ${path.join(OUT_DIR, "day-fill-marker.webp")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
