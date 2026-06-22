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
 *
 * Product spins are COLOR (the grid/detail viewer uses the color sprite/frames).
 * The halftone "print" treatment is HOME-only and is NOT applied here.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

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

/** Find a file in `files` whose basename === role (case-insensitive) and whose
 * extension is in `exts`. Returns the filename or null. */
function findRole(files, role, exts) {
  const match = files.find((f) => {
    const dot = f.lastIndexOf(".");
    if (dot <= 0) return false;
    const base = f.slice(0, dot).toLowerCase();
    return base === role && exts.includes(extOf(f));
  });
  return match ?? null;
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
async function optimizeImage(srcPath, outPath, label) {
  if (isUpToDate(srcPath, outPath)) {
    log(`  ${label}: up to date, skipping (${rel(outPath)})`);
    summary.skipped++;
    return true;
  }
  const mode = KEEP_BG ? "keep background" : "matte → transparent";
  if (DRY_RUN) {
    log(`  ${label}: would optimize (${mode}) ${rel(srcPath)} -> ${rel(outPath)}`);
    summary.images++;
    return true;
  }
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    let info;
    if (KEEP_BG) {
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
        (KEEP_BG
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
      for (const piece of listDirs(join(INCOMING_DIR, collection, category))) {
        const slug = piece;
        const key = `${collection}/${slug}`;
        if (ONLY && key !== ONLY && ONLY !== `${collection}/${category}/${slug}`) {
          continue;
        }
        const dir = join(INCOMING_DIR, collection, category, piece);
        const files = listFiles(dir);
        if (!files.length) continue;
        processedAny = true;

        log(`\n${collection}/${category}/${slug}`);

        let mainFile = findRole(files, "main", PHOTO_EXTS);
        const altFile = findRole(files, "alt", PHOTO_EXTS);
        const spinFile = findRole(files, "spin", VIDEO_EXTS);

        // Fallback: a lone, non-role-named image is treated as the hero.
        if (!mainFile) {
          const lone = files.filter(
            (f) => PHOTO_EXTS.includes(extOf(f)) && f !== altFile
          );
          if (lone.length === 1) {
            mainFile = lone[0];
            log(`  (using lone image "${mainFile}" as main)`);
          }
        }

        // Start from any existing entry so price/isSold (and prior asset paths)
        // are preserved, then refresh derived fields from the folder.
        const prev = generated[key] ?? {};
        const entry = {
          category,
          title: humanizeSlug(slug),
          defaultImage: prev.defaultImage ?? null,
          alternateImage: null,
          spinMedia: null,
          hoverType: "staticOnly",
          price: typeof prev.price === "number" ? prev.price : 0,
          isSold: typeof prev.isSold === "boolean" ? prev.isSold : false,
        };

        if (mainFile) {
          const out = join(PRODUCTS_OUT_ROOT, collection, slug, "main.webp");
          if (await optimizeImage(join(dir, mainFile), out, "main")) {
            entry.defaultImage = `/images/products/${collection}/${slug}/main.webp`;
          }
        } else {
          addWarning(
            `"${collection}/${category}/${slug}" has no main.* photo; ` +
              "skipping (a hero photo is required to add the piece)."
          );
          continue;
        }

        if (altFile) {
          const out = join(PRODUCTS_OUT_ROOT, collection, slug, "alt.webp");
          if (await optimizeImage(join(dir, altFile), out, "alt")) {
            entry.alternateImage = `/images/products/${collection}/${slug}/alt.webp`;
          }
        }

        if (spinFile) {
          if (buildSpin(join(dir, spinFile), slug)) {
            entry.spinMedia = `/images/spin/${slug}`;
          }
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
