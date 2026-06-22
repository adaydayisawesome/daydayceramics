/**
 * Shared still-photo matting helper for the asset pipeline.
 *
 * Uses the SAME background-removal approach as the spin pipeline
 * (`@imgly/background-removal-node`) plus an alpha bounding-box auto-crop, so a
 * matted product photo floats on the page exactly like the (already
 * background-removed, transparent) spin frames — no backdrop box, no shadow.
 *
 * `build.mjs` mattes a whole turntable SEQUENCE and crops to a single UNION
 * bbox (so the object doesn't jitter between frames); here we matte ONE still
 * and crop to its own alpha bbox. The matting call and the bbox math mirror
 * that pipeline.
 */

import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

import sharp from "sharp";

sharp.simd(false);

/**
 * Remove the background of a single image to a transparent PNG buffer using
 * `@imgly/background-removal-node` (the model ships with the package, so this
 * works offline once installed). The source is pre-rotated to bake EXIF
 * orientation, then handed to the matter as a file path (matching build.mjs).
 */
export async function removeBackgroundToPng(srcPath) {
  let removeBackground;
  try {
    ({ removeBackground } = await import("@imgly/background-removal-node"));
  } catch (e) {
    throw new Error(
      "Background matting requires @imgly/background-removal-node " +
        "(install with: npm install -D @imgly/background-removal-node). " +
        `Original error: ${e.message}`,
    );
  }

  const tmpDir = join(os.tmpdir(), `asset-matte-${process.pid}-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  const orientedPath = join(tmpDir, "oriented.png");
  try {
    // Bake EXIF orientation so the matte + crop operate on the upright image.
    await sharp(srcPath).rotate().png().toFile(orientedPath);
    const blob = await removeBackground(orientedPath);
    return Buffer.from(await blob.arrayBuffer());
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Compute the alpha bounding box of an RGBA image buffer (pixels with
 * alpha > threshold). Returns null when fully transparent. Mirrors the
 * `alphaBBox` used by the spin pipeline.
 */
export async function alphaBBox(input, threshold = 16) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
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

/**
 * Matte a still product photo to transparent, auto-crop to its alpha bbox with
 * a little padding, cap the long edge, and write a transparent WebP.
 *
 * @returns {Promise<{width:number,height:number,size:number}>} output info
 */
export async function matteCropToWebp(
  srcPath,
  outPath,
  { maxEdge = 1600, quality = 82, padPct = 4, threshold = 16 } = {},
) {
  const matted = await removeBackgroundToPng(srcPath);
  const bbox = await alphaBBox(matted, threshold);

  let pipeline = sharp(matted).ensureAlpha();
  if (bbox) {
    const padX = Math.round(((bbox.maxX - bbox.minX) * padPct) / 100);
    const padY = Math.round(((bbox.maxY - bbox.minY) * padPct) / 100);
    const left = Math.max(0, bbox.minX - padX);
    const top = Math.max(0, bbox.minY - padY);
    const right = Math.min(bbox.width - 1, bbox.maxX + padX);
    const bottom = Math.min(bbox.height - 1, bbox.maxY + padY);
    pipeline = pipeline.extract({
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
    });
  }

  return pipeline
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, alphaQuality: 100 })
    .toFile(outPath);
}
