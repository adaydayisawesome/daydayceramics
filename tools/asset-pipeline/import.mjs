#!/usr/bin/env node
/**
 * Batch asset importer for Day Day Ceramics.
 *
 * Walks the local-only drop zone, grouped by CATEGORY:
 *
 *   assets-incoming/<collection>/<category>/<piece>/
 *       main.<ext>   primary hero photo  -> public/images/products/<collection>/<piece>/main.webp  (defaultImage)
 *       alt.<ext>    optional 2nd angle  -> public/images/products/<collection>/<piece>/alt.webp   (alternateImage)
 *       spin.<ext>   optional 360 video  -> public/images/spin/<piece>/                            (spinMedia, COLOR)
 *
 * The PIECE FOLDER NAME is the product: `slug` = folder name, `title` = its
 * humanized form, `category` = parent folder, `collection` = grandparent. Each
 * piece is recorded as a FULL entry in `src/lib/product-assets.generated.json`,
 * which `src/lib/products.ts` MERGES onto the hand-authored seed catalog
 * (supplying category/asset fields to seeded pieces, and APPENDING brand-new
 * pieces). `price`/`isSold` default to 0/false and are PRESERVED across runs
 * (never clobbered once edited). This is non-destructive: empty folders leave
 * the live demo catalog untouched.
 *
 * Product photos (main/alt) are background-removed to TRANSPARENT and auto-
 * cropped BY DEFAULT (same matter as the spin pipeline) so pieces float on the
 * page with no backdrop box or drop shadow. Pass --no-matte / --keep-bg to keep
 * the original background (e.g. for photos that are already cut out).
 *
 * hoverType precedence per piece: spin present -> "spin360";
 *   else alt present -> "alternateAngle"; else "staticOnly".
 *
 * Usage:
 *   npm run import-assets                       # process everything
 *   npm run import-assets -- --dry-run          # print planned actions, write nothing
 *   npm run import-assets -- --only darling-babies/ramen-bowl-blue
 *   npm run import-assets -- --scaffold         # (re)create the category drop-zone folders + README
 *   npm run import-assets -- --force            # reprocess even if outputs look up to date
 *
 * Options:
 *   --dry-run                 Plan only; no files written, no spin pipeline run.
 *   --only <collection/piece>     Restrict to one piece (accepts collection/category/piece too).
 *   --scaffold                Create assets-incoming/<collection>/<category>/ for both
 *                             collections × all categories (+ a README), then continue importing.
 *   --force                   Ignore the mtime skip check and reprocess inputs.
 *   --no-matte / --keep-bg    Keep the photo's original background (default: matte to transparent).
 *   --max-edge <px>           Long-edge cap for optimized photos (default 1600).
 *   --quality <1..100>        WebP quality for photos (default 82).
 *   --spin-frames <N>         Frames to sample for the spin (forwarded to build.mjs).
 *   --spin-matte <mode>       Background removal for the spin: imgly | rembg | none.
 *   --hero <substr>           When a piece ships several photos (e.g. a zip) and
 *                             none is named main/hero, pick the hero photo whose
 *                             filename contains this substring (case-insensitive).
 *
 * ZIP / GALLERY pieces: a piece folder may instead contain a single `.zip`
 * (any name), OR a loose `<Name>.zip` may sit directly in the category folder
 * (slug = kebab-cased zip basename, e.g. `Raku_White_Bowl.zip` ->
 * `raku-white-bowl`). It is unpacked to a temp dir and its contents classified —
 * videos become the spin source, images become the gallery. Junk/odd entries
 * (macOS resource forks, dotfiles, phone share/scan exports like `s67 ...jpg`)
 * are ignored. The HERO (grid static) is matted→transparent like a loose
 * `main.*`; EVERY photo is ALSO optimized with its ORIGINAL background into
 * `.../<piece>/detail/NN.webp` and recorded as the detail-page gallery
 * (`detailImages`). Hero precedence: explicit main/hero name > --hero substring
 * > first alphabetically. Loose `main/alt/spin` still work.
 *
 * When a piece ships MORE THAN ONE video, the first/explicit clip drives the
 * 360 spin and each remaining clip is optimized into `.../<piece>/video/NN.mp4`
 * and surfaced on the detail page as an inline player (`detailVideos`).
 *
 * Product spins are COLOR (the grid/detail viewer uses the color sprite/frames).
 * The halftone "print" treatment is HOME-only and is NOT applied here.
 */

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";

import { matteCropToWebp } from "./matte.mjs";

sharp.simd(false);

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

const INCOMING_DIR = join(REPO_ROOT, "assets-incoming");
const PRODUCTS_OUT_ROOT = join(REPO_ROOT, "public", "images", "products");
const SPIN_OUT_ROOT = join(REPO_ROOT, "public", "images", "spin");
const PRODUCTS_TS = join(REPO_ROOT, "src", "lib", "products.ts");
const GENERATED_JSON = join(
  REPO_ROOT,
  "src",
  "lib",
  "product-assets.generated.json"
);
const SPIN_BUILD = join(REPO_ROOT, "tools", "spin-pipeline", "build.mjs");
const README_DST = join(INCOMING_DIR, "README.md");

const PHOTO_EXTS = ["jpg", "jpeg", "png", "webp", "heic", "tif", "tiff"];
const VIDEO_EXTS = ["mp4", "mov", "m4v", "webm"];
const ARCHIVE_EXTS = ["zip"];

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
const DRY_RUN = Boolean(args["dry-run"]);
const FORCE = Boolean(args.force);
const SCAFFOLD = Boolean(args.scaffold);
const ONLY = args.only ? String(args.only).replace(/^\/+|\/+$/g, "") : null;
const MAX_EDGE = args["max-edge"] ? parseInt(args["max-edge"], 10) : 1600;
const QUALITY = args.quality ? parseInt(args.quality, 10) : 82;
const SPIN_FRAMES = args["spin-frames"] ? String(args["spin-frames"]) : null;
const SPIN_MATTE = args["spin-matte"] ? String(args["spin-matte"]) : null;
// Optional hint to pick which photo becomes the grid HERO when a piece ships
// several photos (e.g. inside a zip) and none is explicitly named main/hero.
// Matched as a case-insensitive substring against the photo filename.
const HERO = args.hero ? String(args.hero) : null;
// Product photos are background-removed to transparent + auto-cropped BY
// DEFAULT so pieces float on the page (no backdrop box / shadow), matching the
// transparent spin frames. Opt out with --no-matte / --keep-bg for photos that
// are already cut out or should keep their background.
const KEEP_BG = Boolean(args["no-matte"] || args["keep-bg"]);

const tag = DRY_RUN ? "[import:dry]" : "[import]";
function log(...m) {
  console.log(tag, ...m);
}
function warn(...m) {
  console.warn(tag, "WARNING:", ...m);
}

const summary = {
  images: 0,
  spins: 0,
  productsUpdated: 0,
  skipped: 0,
  warnings: [],
};
function addWarning(msg) {
  summary.warnings.push(msg);
  warn(msg);
}

// ---------------------------------------------------------------------------
// Config parsing — derive the valid COLLECTION and CATEGORY slugs from
// products.ts WITHOUT importing the TS module (this is plain Node/ESM), so the
// importer and the app share a single source of truth.
//   - A COLLECTION slug is the one immediately followed by `title:` + `tagline:`.
//   - CATEGORY slugs come from the exported `CATEGORIES` registry
//     (`{ slug: "...", label: "..." }`).
// The drop-zone layout is `<collection>/<category>/<piece>/`; the piece folder
// name itself becomes the product slug/title (no catalog membership required).
// ---------------------------------------------------------------------------
function readConfig() {
  const src = readFileSync(PRODUCTS_TS, "utf8");

  const collRe = /slug:\s*"([^"]+)"\s*,\s*title:\s*"[^"]*"\s*,\s*tagline:/g;
  const collectionSlugs = [];
  let m;
  while ((m = collRe.exec(src))) collectionSlugs.push(m[1]);

  const catBlock = src.match(/CATEGORIES\b[^=]*=\s*\[([\s\S]*?)\]/);
  const categorySlugs = [];
  if (catBlock) {
    const catRe = /slug:\s*"([^"]+)"\s*,\s*label:/g;
    while ((m = catRe.exec(catBlock[1]))) categorySlugs.push(m[1]);
  }

  if (!collectionSlugs.length || !categorySlugs.length) {
    throw new Error(
      `Could not parse collections/categories from ${PRODUCTS_TS}. ` +
        `The importer expects the standard products.ts shape ` +
        `(collections with title/tagline + an exported CATEGORIES registry).`
    );
  }
  return { collectionSlugs, categorySlugs };
}

/** Filename without its extension, e.g. "Raku_White_Bowl.zip" -> "Raku_White_Bowl". */
function baseNameNoExt(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/**
 * Kebab-case a free-form name into a URL/slug-safe form, e.g.
 * "Raku_White_Bowl" / "Raku White Bowl" -> "raku-white-bowl".
 */
function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Title-case a kebab slug, e.g. `ramen-bowl-blue` -> "Ramen Bowl Blue". */
function humanizeSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Drop-zone scaffolding
// ---------------------------------------------------------------------------
function readmeBody(collectionSlugs, categorySlugs) {
  const catList = categorySlugs.map((s) => `\`${s}\``).join(", ");
  const collList = collectionSlugs.map((s) => `\`${s}\``).join(", ");
  return `# assets-incoming (local-only drop zone)

Drop raw product photos and 360° turntable videos here, then run:

    npm run import-assets

This folder is **gitignored** — only the processed, optimized assets under
\`public/images/\` get committed. See \`tools/asset-pipeline/README.md\` for the
full guide.

## Structure

    assets-incoming/<collection>/<category>/<piece>/
        main.<ext>    # required hero photo  -> defaultImage
        alt.<ext>     # optional 2nd angle   -> alternateImage / alternateAngle hover
        spin.<ext>    # optional 360 video   -> spin360 hover (COLOR)

Or drop a single **\`.zip\`** in the piece folder (any name) holding several
photos + a 360 video. It is unpacked and classified automatically: the video
becomes the spin, the photos become the detail-page **gallery**, and one photo
becomes the matted grid hero (name a photo \`main\`/\`hero\`, pass
\`--hero <substr>\`, or it defaults to the first alphabetically). Gallery photos
keep their original background; only the grid hero + spin are matted.

- **<collection>**: ${collList}
- **<category>**: ${catList}
- **<piece>**: a kebab-case folder name YOU pick. **The piece folder name
  becomes the product** — its \`slug\` is the folder name and its \`title\` is the
  humanized version (e.g. \`ramen-bowl-blue\` -> "Ramen Bowl Blue"). Drop a new
  piece folder under the right category and it's added to that collection's grid
  on the next import.

Match files by the \`main\` / \`alt\` / \`spin\` basename (case-insensitive). A lone
image with any name is treated as \`main\`, but explicit names are preferred.

New pieces import with placeholder \`price: 0\` / \`isSold: false\`; edit those in
\`src/lib/product-assets.generated.json\` and they are **preserved** across
re-imports.

## Accepted file types

- Photos: jpg, jpeg, png, webp, heic, tif, tiff
- Videos: mp4, mov, m4v, webm

## Specs

**Photos** — ≥1600px on the long edge, consistent lighting, white or transparent
background ideal. Output is capped to ~1600px WebP.

**360 video** — one full rotation, steady camera, even lighting, plain
contrasting background (clean matting), ~6–15s, ≥720p, object centered.

Product spins render in **full color**. The halftone "print" look is home-only.
`;
}

function scaffold(collectionSlugs, categorySlugs) {
  log(`scaffolding drop zone -> ${rel(INCOMING_DIR)}`);
  for (const collection of collectionSlugs) {
    for (const category of categorySlugs) {
      const dir = join(INCOMING_DIR, collection, category);
      if (DRY_RUN) {
        if (!existsSync(dir)) log(`  would create ${rel(dir)}/`);
        continue;
      }
      mkdirSync(dir, { recursive: true });
    }
  }
  const body = readmeBody(collectionSlugs, categorySlugs);
  if (!DRY_RUN) {
    writeFileSync(README_DST, body);
    log(`  wrote ${rel(README_DST)}`);
  } else {
    log(`  would write ${rel(README_DST)}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rel(p) {
  return p.startsWith(REPO_ROOT + "/") ? p.slice(REPO_ROOT.length + 1) : p;
}

function listDirs(parent) {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => !n.startsWith("."))
    .sort();
}

function listFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.startsWith("."))
    .map((d) => d.name);
}

function extOf(name) {
  return extname(name).slice(1).toLowerCase();
}

/** Lowercased basename (no extension) of a filename, e.g. "Main.JPG" -> "main". */
function baseName(name) {
  const dot = name.lastIndexOf(".");
  return (dot > 0 ? name.slice(0, dot) : name).toLowerCase();
}

/**
 * True for odd/junk archive entries we must NOT treat as real product media,
 * even when they carry an image/video extension. Covers macOS resource forks
 * (`__MACOSX/`, `._foo`), dotfiles, and the share/scan exports some phones drop
 * into a folder (e.g. `s67 2026-06-20 105746DF1BFE628BAC.jpg`). Real shots use
 * the camera-roll `IMG_####` / `video_########` naming and pass through.
 */
function isJunkEntry(name) {
  const base = name.split("/").pop() ?? name;
  if (!base || base.startsWith(".")) return true;
  if (/__MACOSX/i.test(name)) return true;
  if (/^s\d+[\s_-]/i.test(base)) return true;
  return false;
}

/**
 * Gather a piece's input files as `{ name, path }` entries from BOTH the loose
 * files in its folder AND any `.zip` archives it contains (unpacked, flattened,
 * to `workDir`). Returns the entries plus the temp `workDir` (null when no zip)
 * so the caller can clean it up. Uses the system `unzip`.
 */
function collectPieceEntries(dir, files) {
  const entries = files
    .filter((f) => !ARCHIVE_EXTS.includes(extOf(f)))
    .map((name) => ({ name, path: join(dir, name) }));

  const zips = files.filter((f) => ARCHIVE_EXTS.includes(extOf(f)));
  let workDir = null;
  if (zips.length) {
    workDir = join(os.tmpdir(), `asset-zip-${process.pid}-${Date.now()}`);
    mkdirSync(workDir, { recursive: true });
    for (const z of zips) {
      // -o overwrite, -j junk paths (flatten any nested folders in the archive).
      execFileSync("unzip", ["-o", "-j", join(dir, z), "-d", workDir], {
        stdio: "ignore",
      });
    }
    for (const name of listFiles(workDir)) {
      entries.push({ name, path: join(workDir, name) });
    }
  }
  return { entries, workDir };
}

/** Like `findRole`, but over `{ name, path }` entries. Returns the entry/null. */
function findRoleEntry(entries, role, exts) {
  return (
    entries.find((e) => baseName(e.name) === role && exts.includes(extOf(e.name))) ??
    null
  );
}

/**
 * Choose the grid HERO photo from a list of `{ name, path }` photo entries.
 * Precedence: explicit `main.*`/`hero.*` name > `--hero <substr>` match >
 * first alphabetically. Returns the entry (or null when there are no photos).
 */
function pickHero(photoEntries, key) {
  if (!photoEntries.length) return null;
  const explicit =
    findRoleEntry(photoEntries, "main", PHOTO_EXTS) ??
    findRoleEntry(photoEntries, "hero", PHOTO_EXTS);
  if (explicit) return explicit;
  if (HERO) {
    const want = HERO.toLowerCase();
    const hit = photoEntries.find((e) => e.name.toLowerCase().includes(want));
    if (hit) return hit;
    addWarning(`--hero "${HERO}" matched no photo for ${key}; using first alphabetically.`);
  }
  return [...photoEntries].sort((a, b) => a.name.localeCompare(b.name))[0];
}

/** True if `out` exists and is at least as new as `src` (skip-unchanged). */
function isUpToDate(src, out) {
  if (FORCE) return false;
  if (!existsSync(out)) return false;
  try {
    return statSync(out).mtimeMs >= statSync(src).mtimeMs;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Image optimization
// ---------------------------------------------------------------------------
async function optimizeImage(srcPath, outPath, label, opts = {}) {
  // `keepBg` may be forced per call (gallery/detail photos always keep their
  // original background); otherwise fall back to the global matte default.
  const keepBg = opts.keepBg ?? KEEP_BG;
  if (isUpToDate(srcPath, outPath)) {
    log(`  ${label}: up to date, skipping (${rel(outPath)})`);
    summary.skipped++;
    return true;
  }
  const mode = keepBg ? "keep background" : "matte → transparent";
  if (DRY_RUN) {
    log(`  ${label}: would optimize (${mode}) ${rel(srcPath)} -> ${rel(outPath)}`);
    summary.images++;
    return true;
  }
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    let info;
    if (keepBg) {
      // Keep the original background; just orient, downscale, and encode.
      info = await sharp(srcPath, { failOn: "none" })
        .rotate() // respect EXIF orientation
        .resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: QUALITY, alphaQuality: 100 })
        .toFile(outPath);
    } else {
      // Default: remove the background to transparent + auto-crop to the alpha
      // bbox (shared helper, same matter as the spin pipeline) so the piece
      // floats with no backdrop box or shadow.
      info = await matteCropToWebp(srcPath, outPath, {
        maxEdge: MAX_EDGE,
        quality: QUALITY,
        padPct: 4,
      });
    }
    log(
      `  ${label}: wrote ${rel(outPath)} (${info.width}x${info.height}, ${(
        info.size / 1024
      ).toFixed(0)}kB, ${mode})`
    );
    summary.images++;
    return true;
  } catch (e) {
    addWarning(
      `failed to optimize ${rel(srcPath)} (${e.message}). ` +
        (keepBg
          ? ""
          : "Matting uses @imgly/background-removal-node (model download needs " +
            "network on first run); pass --no-matte to keep the background. ") +
        (extOf(srcPath) === "heic"
          ? "HEIC may need a libheif-enabled sharp/libvips build."
          : "")
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Detail video optimization (extra clips beyond the 360 spin)
// ---------------------------------------------------------------------------
/**
 * Optimize an EXTRA clip (a piece shipped more than one video; the first/explicit
 * one drives the 360 spin) into a web-friendly, muted, faststart H.264 mp4 that
 * the detail page plays inline. Falls back to a raw copy if ffmpeg is missing.
 */
async function optimizeVideo(srcPath, outPath, label) {
  if (isUpToDate(srcPath, outPath)) {
    log(`  ${label}: up to date, skipping (${rel(outPath)})`);
    summary.skipped++;
    return true;
  }
  if (DRY_RUN) {
    log(`  ${label}: would optimize ${rel(srcPath)} -> ${rel(outPath)}`);
    summary.images++;
    return true;
  }
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        srcPath,
        "-an", // detail clips render muted
        "-vf",
        "scale='min(1080,iw)':-2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "26",
        "-preset",
        "veryfast",
        "-movflags",
        "+faststart",
        outPath,
      ],
      { stdio: "ignore" }
    );
    log(`  ${label}: wrote ${rel(outPath)}`);
    summary.images++;
    return true;
  } catch (e) {
    // ffmpeg-static ships the binary offline, but if the re-encode fails fall
    // back to a raw copy so the clip is still surfaced (never silently dropped).
    try {
      copyFileSync(srcPath, outPath);
      log(`  ${label}: ffmpeg failed (${e.message}); copied raw -> ${rel(outPath)}`);
      summary.images++;
      return true;
    } catch (e2) {
      addWarning(`failed to write detail video ${rel(outPath)} (${e2.message}).`);
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Spin pipeline invocation (COLOR)
// ---------------------------------------------------------------------------
function buildSpin(srcPath, name) {
  const outDir = join(SPIN_OUT_ROOT, name);
  const manifest = join(outDir, "manifest.json");
  if (isUpToDate(srcPath, manifest)) {
    log(`  spin: up to date, skipping (${rel(outDir)})`);
    summary.skipped++;
    return true;
  }
  const passthrough = [];
  if (SPIN_FRAMES) passthrough.push("--frames", SPIN_FRAMES);
  if (SPIN_MATTE) passthrough.push("--matte", SPIN_MATTE);
  const cmd = [
    SPIN_BUILD,
    "--input",
    srcPath,
    "--name",
    name,
    ...passthrough,
  ];
  if (DRY_RUN) {
    log(`  spin: would run build.mjs ${cmd.slice(1).join(" ")}`);
    summary.spins++;
    return true;
  }
  try {
    log(`  spin: building COLOR spin -> ${rel(outDir)}`);
    execFileSync(process.execPath, cmd, { stdio: "inherit" });
    summary.spins++;
    return true;
  } catch (e) {
    addWarning(
      `spin build failed for "${name}" (${e.message}). ` +
        "Background removal needs network on first run; try --spin-matte none for an offline test."
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Generated overrides map (idempotent merge)
// ---------------------------------------------------------------------------
function loadOverrides() {
  if (!existsSync(GENERATED_JSON)) return {};
  try {
    const txt = readFileSync(GENERATED_JSON, "utf8").trim();
    return txt ? JSON.parse(txt) : {};
  } catch (e) {
    addWarning(
      `could not parse ${rel(GENERATED_JSON)} (${e.message}); starting fresh.`
    );
    return {};
  }
}

function writeOverrides(map) {
  const sorted = {};
  for (const key of Object.keys(map).sort()) sorted[key] = map[key];
  writeFileSync(GENERATED_JSON, JSON.stringify(sorted, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { collectionSlugs, categorySlugs } = readConfig();
  const validCollections = new Set(collectionSlugs);
  const validCategories = new Set(categorySlugs);

  if (SCAFFOLD) scaffold(collectionSlugs, categorySlugs);

  if (!existsSync(INCOMING_DIR)) {
    log(`no drop zone at ${rel(INCOMING_DIR)} — nothing to import.`);
    if (!SCAFFOLD) log("tip: run with --scaffold to create the folders.");
    printSummary();
    return;
  }

  // Generated layer is keyed by "<collection>/<piece>" and PRESERVES any
  // human-edited price/isSold across runs.
  const generated = loadOverrides();
  let processedAny = false;

  for (const collection of listDirs(INCOMING_DIR)) {
    if (!validCollections.has(collection)) {
      addWarning(
        `skipping unknown collection "${collection}/" ` +
          `(expected one of: ${collectionSlugs.join(", ")}).`
      );
      continue;
    }
    for (const category of listDirs(join(INCOMING_DIR, collection))) {
      if (!validCategories.has(category)) {
        addWarning(
          `skipping unknown category "${collection}/${category}/" ` +
            `(expected one of: ${categorySlugs.join(", ")}).`
        );
        continue;
      }
      const categoryDir = join(INCOMING_DIR, collection, category);
      // A "piece unit" is either a piece SUBFOLDER (slug = folder name, the
      // classic convention) OR a loose `.zip` dropped directly in the category
      // folder (slug = kebab-cased zip basename, e.g. `Raku_White_Bowl.zip` ->
      // `raku-white-bowl`). The latter lets a user just drop a zip without
      // first making a piece folder; either way it's handled identically below.
      const units = [];
      for (const piece of listDirs(categoryDir)) {
        units.push({
          slug: piece,
          dir: join(categoryDir, piece),
          files: listFiles(join(categoryDir, piece)),
        });
      }
      for (const f of listFiles(categoryDir)) {
        if (ARCHIVE_EXTS.includes(extOf(f))) {
          units.push({ slug: slugify(baseNameNoExt(f)), dir: categoryDir, files: [f] });
        }
      }

      for (const unit of units) {
        const slug = unit.slug;
        const key = `${collection}/${slug}`;
        if (ONLY && key !== ONLY && ONLY !== `${collection}/${category}/${slug}`) {
          continue;
        }
        const dir = unit.dir;
        const files = unit.files;
        if (!files.length) continue;
        processedAny = true;

        log(`\n${collection}/${category}/${slug}`);

        // Gather inputs from loose files AND any `.zip` archive (unpacked to a
        // temp dir). Classify by type so the same code path serves both the
        // loose `main/alt/spin` convention and zip/gallery drops.
        const { entries, workDir } = collectPieceEntries(dir, files);
        try {
          // Drop junk/odd entries (macOS resource forks, dotfiles, phone
          // share/scan exports like `s67 ...jpg`) BEFORE classifying, so they
          // never become a hero/gallery/spin source.
          const usable = entries.filter((e) => !isJunkEntry(e.name));
          const photoEntries = usable.filter((e) =>
            PHOTO_EXTS.includes(extOf(e.name))
          );
          // Sort videos for deterministic selection (the first clip drives the
          // spin; any others are surfaced as detail clips).
          const videoEntries = usable
            .filter((e) => VIDEO_EXTS.includes(extOf(e.name)))
            .sort((a, b) => a.name.localeCompare(b.name));

          // HERO (grid static): explicit main/hero name > --hero > 1st alpha.
          const heroEntry = pickHero(photoEntries, key);
          // ALT (loose convention only): explicit alt.* second angle.
          const altEntry = findRoleEntry(photoEntries, "alt", PHOTO_EXTS);
          // SPIN source: explicit spin.* video > first video (sorted).
          const spinEntry =
            findRoleEntry(videoEntries, "spin", VIDEO_EXTS) ??
            (videoEntries.length ? videoEntries[0] : null);

          // Start from any existing entry so price/isSold (and prior asset paths)
          // are preserved, then refresh derived fields from the folder.
          const prev = generated[key] ?? {};
          const entry = {
            category,
            title: humanizeSlug(slug),
            defaultImage: prev.defaultImage ?? null,
            alternateImage: null,
            spinMedia: null,
            detailImages: [],
            detailVideos: [],
            hoverType: "staticOnly",
            price: typeof prev.price === "number" ? prev.price : 0,
            isSold: typeof prev.isSold === "boolean" ? prev.isSold : false,
          };

          if (heroEntry) {
            const out = join(PRODUCTS_OUT_ROOT, collection, slug, "main.webp");
            log(`  hero: ${heroEntry.name}`);
            if (await optimizeImage(heroEntry.path, out, "main")) {
              entry.defaultImage = `/images/products/${collection}/${slug}/main.webp`;
            }
          } else {
            addWarning(
              `"${collection}/${category}/${slug}" has no photo; ` +
                "skipping (a hero photo is required to add the piece)."
            );
            continue;
          }

          if (altEntry) {
            const out = join(PRODUCTS_OUT_ROOT, collection, slug, "alt.webp");
            if (await optimizeImage(altEntry.path, out, "alt")) {
              entry.alternateImage = `/images/products/${collection}/${slug}/alt.webp`;
            }
          }

          // DETAIL GALLERY: when a piece ships more than one photo, optimize
          // EVERY photo KEEPING its original background (the detail page is not
          // matted) into detail/NN.webp. Order = hero first, then the rest
          // alphabetically. A single-photo piece keeps its current behavior
          // (no gallery -> detailImages stays []).
          if (photoEntries.length > 1) {
            const rest = photoEntries
              .filter((e) => e !== heroEntry)
              .sort((a, b) => a.name.localeCompare(b.name));
            const ordered = [heroEntry, ...rest];
            const detailUrls = [];
            for (let i = 0; i < ordered.length; i++) {
              const nn = String(i + 1).padStart(2, "0");
              const out = join(
                PRODUCTS_OUT_ROOT,
                collection,
                slug,
                "detail",
                `${nn}.webp`
              );
              if (
                await optimizeImage(ordered[i].path, out, `detail ${nn}`, {
                  keepBg: true,
                })
              ) {
                detailUrls.push(
                  `/images/products/${collection}/${slug}/detail/${nn}.webp`
                );
              }
            }
            entry.detailImages = detailUrls;
          }

          if (spinEntry) {
            if (buildSpin(spinEntry.path, slug)) {
              entry.spinMedia = `/images/spin/${slug}`;
            }
          }

          // EXTRA videos: a piece may ship more than one clip (e.g. a clean
          // turntable for the spin + a second angle). The first/explicit clip
          // drives the 360 spin above; any remaining clips are NOT dropped —
          // they are optimized into .../<slug>/video/NN.mp4 and surfaced as
          // inline players on the detail page (`detailVideos`).
          const extraVideos = spinEntry
            ? videoEntries.filter((e) => e !== spinEntry)
            : [];
          if (extraVideos.length) {
            const videoUrls = [];
            for (let i = 0; i < extraVideos.length; i++) {
              const nn = String(i + 1).padStart(2, "0");
              const out = join(
                PRODUCTS_OUT_ROOT,
                collection,
                slug,
                "video",
                `${nn}.mp4`
              );
              if (await optimizeVideo(extraVideos[i].path, out, `video ${nn}`)) {
                videoUrls.push(
                  `/images/products/${collection}/${slug}/video/${nn}.mp4`
                );
              }
            }
            entry.detailVideos = videoUrls;
          }

          // hoverType precedence: spin > alt > staticOnly.
          if (entry.spinMedia) entry.hoverType = "spin360";
          else if (entry.alternateImage) entry.hoverType = "alternateAngle";
          else entry.hoverType = "staticOnly";

          if (DRY_RUN) {
            const isNew = !(key in generated);
            log(
              `  would ${isNew ? "ADD" : "update"} ${key} -> ${JSON.stringify(
                entry
              )}`
            );
          } else {
            generated[key] = entry;
          }
          summary.productsUpdated++;
        } finally {
          if (workDir) rmSync(workDir, { recursive: true, force: true });
        }
      }
    }
  }

  if (ONLY && !processedAny) {
    addWarning(`--only ${ONLY} matched no non-empty piece folder under assets-incoming/.`);
  }

  if (!DRY_RUN) writeOverrides(generated);

  printSummary();
}

function printSummary() {
  log("\n──────── summary ────────");
  log(`  images processed:  ${summary.images}`);
  log(`  spins processed:   ${summary.spins}`);
  log(`  products updated:  ${summary.productsUpdated}`);
  log(`  skipped (current): ${summary.skipped}`);
  log(`  warnings:          ${summary.warnings.length}`);
  if (DRY_RUN) log("  (dry run — no files were written)");
}

main().catch((e) => {
  console.error(tag, "FAILED:", e.message);
  process.exit(1);
});
