/**
 * One-off: cut the halftone kiln out of its background into a transparent WebP,
 * matching the "Creation of Adam" hands treatment so it can sit between them on
 * the cream DAY page.
 *
 * The source has a soft drop-shadow / vignette around the kiln, which a plain
 * luminance key can't remove (it isolates an inner white ring). So we use the
 * SAME AI matter as the hands (`@imgly/background-removal-node` via matte.mjs),
 * which segments the kiln subject regardless of the shadow. We then darken the
 * midtones so the kiln reads as dark as the photographic hands instead of a
 * faded line drawing, and auto-crop to the alpha bbox.
 *
 * Run: node tools/asset-pipeline/kiln.mjs
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import sharp from "sharp";

import { removeBackgroundToPng, alphaBBox } from "./matte.mjs";

sharp.simd(false);

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

const SRC = join(__dirname, "sources", "kiln-source.png");
const OUT = join(repoRoot, "public", "images", "about", "kiln.webp");

// Midtone darkening so the kiln reads as dark as the photographic hands instead
// of a faded line drawing: out = 255 * (in/255) ** GAMMA  (GAMMA > 1 darkens).
const DARKEN_GAMMA = 1.5;
const MAX_EDGE = 1000;
const PAD_PCT = 4;

const darkenLUT = new Uint8Array(256);
for (let v = 0; v < 256; v++) {
  darkenLUT[v] = Math.round(255 * Math.pow(v / 255, DARKEN_GAMMA));
}

async function main() {
  console.log("Matting kiln source (AI)…");
  const matted = await removeBackgroundToPng(SRC);

  const { data, info } = await sharp(matted)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  console.log(`Matted RGBA: ${width}x${height} (${channels}ch)`);

  // Darken RGB (keep matte alpha) so the kiln matches the hands' density.
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    out[i * 4] = darkenLUT[data[s]];
    out[i * 4 + 1] = darkenLUT[data[s + 1]];
    out[i * 4 + 2] = darkenLUT[data[s + 2]];
    out[i * 4 + 3] = data[s + (channels - 1)];
  }

  const bbox = await alphaBBox(
    await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer(),
    16,
  );

  let pipeline = sharp(out, { raw: { width, height, channels: 4 } });
  if (bbox) {
    const padX = Math.round(((bbox.maxX - bbox.minX) * PAD_PCT) / 100);
    const padY = Math.round(((bbox.maxY - bbox.minY) * PAD_PCT) / 100);
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

  const written = await pipeline
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 84, alphaQuality: 100 })
    .toFile(OUT);

  console.log(
    `Wrote ${OUT}: ${written.width}x${written.height} (${written.size} bytes)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
