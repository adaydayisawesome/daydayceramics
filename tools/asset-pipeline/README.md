# Asset Pipeline

One command turns a batch of raw product photos and 360° turntable videos into
committed, optimized web assets and wires them into the product catalog.

```bash
npm run import-assets
```

## How it works

1. You drop raw files into the local-only **drop zone** `assets-incoming/`.
2. `npm run import-assets` walks that folder, **background-removes** each photo
   to transparent + auto-crops it and optimizes with `sharp`, runs the
   [spin pipeline](../spin-pipeline/README.md) on any 360 video, and records
   each product's resolved asset paths into
   `src/lib/product-assets.generated.json`.
3. `src/lib/products.ts` layers that generated map onto the hand-authored
   catalog at load time, so the grid/detail pages pick up the new assets.

The drop zone (`assets-incoming/`) is **gitignored** — the heavy originals never
get committed. Only the processed outputs under `public/images/` are committed.

## Drop-zone structure

```
assets-incoming/<collection-slug>/<product-slug>/
    main.<ext>    # required hero photo  -> defaultImage
    alt.<ext>     # optional 2nd angle   -> alternateImage / "alternateAngle" hover
    spin.<ext>    # optional 360 video   -> "spin360" hover (COLOR)
```

- `<collection-slug>` / `<product-slug>` must match the catalog in
  `src/lib/products.ts` (e.g. `darling-babies/dinner-plate`,
  `ugly-babies/bud-vase`). A folder whose slug isn't in the catalog still gets
  its images optimized, but the importer prints a **WARNING** and does not touch
  the catalog.
- Files are matched by the `main` / `alt` / `spin` basename, **case-insensitive**
  (`Main.JPG` works). A lone image with any other name is treated as `main`, but
  explicit names are preferred.

Run `npm run import-assets -- --scaffold` once to create empty per-product
folders for every catalog product so you can see exactly where to drop files.

## Accepted file types

| Role | Extensions |
| --- | --- |
| Photos (`main`, `alt`) | `jpg`, `jpeg`, `png`, `webp`, `heic`, `tif`, `tiff` |
| Video (`spin`) | `mp4`, `mov`, `m4v`, `webm` |

> HEIC decoding depends on a libheif-enabled `libvips`/`sharp` build. If a HEIC
> fails to decode you'll get a clean warning — re-export it as JPG/PNG.

## Capture specs

**Photos**

- ≥ **1600px** on the long edge (output is capped to ~1600px WebP).
- Consistent, even lighting across the batch.
- Plain, contrasting background ideal — the importer **removes the background to
  transparent** by default, so a clean backdrop mattes best (a soft studio
  shadow is part of the background and gets removed too).
- Object centered and fully in frame.

**360° turntable video**

- **One full rotation**, steady (locked-off) camera — only the turntable moves.
- Even lighting, no moving shadows.
- Plain, **contrasting** background so background removal mattes cleanly.
- ~**6–15s**, ≥ **720p**, object centered and filling a consistent area.

## Output locations

| Input | Output |
| --- | --- |
| `main.*` | `public/images/products/<collection>/<product>/main.webp` |
| `alt.*` | `public/images/products/<collection>/<product>/alt.webp` |
| `spin.*` | `public/images/spin/<product>/` (`sprite.webp` + `manifest.json`; per-frame `frames/` are gitignored) |
| catalog | `src/lib/product-assets.generated.json` (generated; merged by `products.ts`) |

`hoverType` is set by precedence: **spin** present → `spin360`; else **alt**
present → `alternateAngle`; else left as authored (`staticOnly`).

## Transparent product photos (default)

Product photos (`main`, `alt`) are **background-removed to transparent and
auto-cropped by default**, using the same matter as the spin pipeline
(`@imgly/background-removal-node`) plus an alpha bounding-box crop (shared helper
`matte.mjs`). This makes each piece **float on the page** — no backdrop box, no
drop shadow — exactly like the transparent 360 spin frames, so the grid stays
seamless on the pure-white layout.

Opt out per run with **`--no-matte`** (alias `--keep-bg`) when a photo is already
cut out or should keep its background:

```bash
npm run import-assets -- --no-matte
```

> Matting downloads an ONNX model on first run (network required); the model
> then ships cached in the package for offline use. If matting fails you get a
> clean warning suggesting `--no-matte`.

## Command + flags

```bash
npm run import-assets                       # process the whole drop zone
npm run import-assets -- --dry-run          # print the plan; write nothing
npm run import-assets -- --only darling-babies/dinner-plate
npm run import-assets -- --scaffold         # (re)create the empty drop-zone folders + README
npm run import-assets -- --force            # reprocess even if outputs look up to date
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--dry-run` | off | Plan only — log every action and the catalog change without writing. |
| `--only <collection/product>` | — | Restrict to a single product folder. |
| `--scaffold` | off | Create empty `assets-incoming/<collection>/<product>/` for every catalog product (+ README), then import. |
| `--force` | off | Ignore the mtime "unchanged" skip check and reprocess. |
| `--no-matte` / `--keep-bg` | off | Keep the photo's original background instead of matting to transparent. |
| `--max-edge <px>` | `1600` | Long-edge cap for optimized photos. |
| `--quality <1..100>` | `82` | WebP quality for photos. |
| `--spin-frames <N>` | pipeline default | Frames sampled for the spin (forwarded to `build.mjs`). |
| `--spin-matte <mode>` | `imgly` | Spin background removal: `imgly` \| `rembg` \| `none`. |

## Idempotency

Re-running is safe. Each product folder is processed **authoritatively** (its
generated entry reflects exactly the files present now), while other products'
entries are preserved. Unchanged inputs are skipped via an mtime check (use
`--force` to override). The generated JSON is sorted and stable, so re-running
with the same inputs produces no diff.

## Product spins are COLOR

Product grid/detail spins use the **full-color** sprite/frames. The grainy
black-and-white **halftone "print"** treatment (`tools/spin-pipeline/treat.mjs`)
is **HOME-only** and is never applied by this importer.

> Note: `build.mjs` always also bakes a `sprite-print.webp` (the home variant)
> next to the color `sprite.webp`. Product pages only ever consume the color
> sprite/frames, so product spins stay full color.

## Network / sandbox note

The 360 spin step removes the background with `@imgly/background-removal-node`,
which downloads an ONNX model on first run (network required). In a restricted
sandbox, run with elevated network access, or use `--spin-matte none` for an
offline smoke test (no transparency). Photo optimization is fully offline.
