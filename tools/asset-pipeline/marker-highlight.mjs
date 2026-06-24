/**
 * Generates a neon-green highlighter / brush-stroke texture used behind text
 * (e.g. "adoption agency" under the DAY tagline). The look is many overlapping
 * translucent vertical streaks with uneven top/bottom edges — a marker swipe.
 *
 * Output: public/images/home-v2/marker-highlight.webp (transparent background).
 * Run: node tools/asset-pipeline/marker-highlight.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(
  __dirname,
  "..",
  "..",
  "public",
  "images",
  "home-v2",
  "marker-highlight.webp"
);

const W = 1200;
const H = 320;
const GREEN = "#03F94D";

// Deterministic PRNG so the texture is stable across runs.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260623);
const lerp = (a, b, t) => a + (b - a) * t;

const streaks = [];
const COUNT = 110;
for (let i = 0; i < COUNT; i++) {
  const x = lerp(8, W - 8, rand());
  const w = lerp(6, 18, rand());
  // Tall streaks dominate; a few short ones add grain.
  const tall = rand() > 0.25;
  const top = tall ? lerp(6, 60, rand()) : lerp(40, 150, rand());
  const bottom = tall ? lerp(H - 60, H - 6, rand()) : lerp(H - 150, H - 40, rand());
  const opacity = lerp(0.14, 0.5, rand());
  streaks.push({ x, w, top, bottom, opacity });
}

const rects = streaks
  .map(
    (s) =>
      `<rect x="${(s.x - s.w / 2).toFixed(1)}" y="${s.top.toFixed(1)}" width="${s.w.toFixed(
        1
      )}" height="${(s.bottom - s.top).toFixed(1)}" rx="${(s.w / 2).toFixed(
        1
      )}" fill="${GREEN}" fill-opacity="${s.opacity.toFixed(3)}" />`
  )
  .join("\n  ");

// A soft base wash so gaps between streaks still read as highlighted.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="14" y="34" width="${W - 28}" height="${H - 68}" rx="40" fill="${GREEN}" fill-opacity="0.12" />
  ${rects}
</svg>`;

await sharp(Buffer.from(svg)).webp({ quality: 92, alphaQuality: 100 }).toFile(OUT);
console.log("wrote", OUT);
