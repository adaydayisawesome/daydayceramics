# Asset Pipeline

One command turns a batch of raw product photos and 360° turntable videos into
committed, optimized web assets and wires them into the product catalog.

```bash
npm run import-assets
```

## How it works

1. You drop raw files into the local-only **drop zone** `assets-incoming/`,
   grouped by **collection → category → piece**.
2. `npm run import-assets` walks that folder, **background-removes** each photo
   to transparent + auto-crops it and optimizes with `sharp`, runs the
   [spin pipeline](../spin-pipeline/README.md) on any 360 video, and records
   each piece as a full entry into `src/lib/product-assets.generated.json`.
3. `src/lib/products.ts` **merges** that generated layer onto the hand-authored
   seed catalog at load time, so the grid/detail pages pick up the new assets
   and any brand-new pieces.

The drop zone (`assets-incoming/`) is **gitignored** — the heavy originals never
get committed. Only the processed outputs under `public/images/` are committed.

## Drop-zone structure

```
assets-incoming/<collection>/<category>/<piece>/
    main.<ext>    # required hero photo  -> defaultImage
    alt.<ext>     # optional 2nd angle   -> alternateImage / "alternateAngle" hover
    spin.<ext>    # optional 360 video   -> "spin360" hover (COLOR)
```

- **`<collection>`** — one of the two collection slugs: `darling-babies`,
  `ugly-babies`.
- **`<category>`** — one of the six category slugs from the `CATEGORIES`
  registry in `src/lib/products.ts`: `bowls`, `cups`, `mugs`, `coffee-drippers`,
  `plates`, `objects`. Category is an **internal tag only** — collection pages
  render a single flat grid each and never show category section headers.
  Unknown collection/category folders are skipped with a **WARNING**.
- **`<piece>`** — a kebab-case folder name **you** pick. **The piece folder name
  becomes the product**: its `slug` is the folder name (kept as-is) and its
  `title` is the humanized form (`ramen-bowl-blue` → "Ramen Bowl Blue"). Its
  `category` is the parent folder and `collection` the grandparent.
- Files are matched by the `main` / `alt` / `spin` basename, **case-insensitive**
  (`Main.JPG` works). A lone image with any other name is treated as `main`, but
  explicit names are preferred. A piece **requires a `main.*`** to be imported.

Run `npm run import-assets -- --scaffold` once to create the category folders
for both collections so you can see exactly where to drop new piece folders.

## Catalog merge (non-destructive)

`products.ts` keeps a hand-authored **seed** catalog and unions it with the
generated layer by `"<collection>/<slug>"`:

- A generated piece that **matches a seed product** supplies its `category` +
  asset fields (`defaultImage` / `alternateImage` / `spinMedia` / `hoverType`).
  Human-edited fields (`price`, `isSold`, `shopify*`, `title`) stay authoritative
  on the seed.
- A generated piece with **no seed match** is **appended** as a new product in
  its collection's grid.
- **`price` / `isSold`** default to `0` / `false` for a freshly imported piece
  and are **preserved across re-imports** — edit them in
  `product-assets.generated.json` and the importer never clobbers them. (Shopify
  IDs stay `null`.)

With an empty generated file the live demo catalog renders exactly as authored.

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
| `main.*` | `public/images/products/<collection>/<piece>/main.webp` |
| `alt.*` | `public/images/products/<collection>/<piece>/alt.webp` |
| `spin.*` | `public/images/spin/<piece>/` (`sprite.webp` + `manifest.json`; per-frame `frames/` are gitignored) |
| catalog | `src/lib/product-assets.generated.json` (generated; merged by `products.ts`) |

> Output paths drop the category — only `<collection>/<piece>` is used — so a
> piece can be re-filed under a different category without moving its assets.

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
npm run import-assets -- --only darling-babies/ramen-bowl-blue
npm run import-assets -- --scaffold         # (re)create the category drop-zone folders + README
npm run import-assets -- --force            # reprocess even if outputs look up to date
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--dry-run` | off | Plan only — log every action and the catalog change without writing. |
| `--only <collection/piece>` | — | Restrict to a single piece (also accepts `<collection>/<category>/<piece>`). |
| `--scaffold` | off | Create `assets-incoming/<collection>/<category>/` for both collections × all categories (+ README), then import. |
| `--force` | off | Ignore the mtime "unchanged" skip check and reprocess. |
| `--no-matte` / `--keep-bg` | off | Keep the photo's original background instead of matting to transparent. |
| `--max-edge <px>` | `1600` | Long-edge cap for optimized photos. |
| `--quality <1..100>` | `82` | WebP quality for photos. |
| `--spin-frames <N>` | pipeline default | Frames sampled for the spin (forwarded to `build.mjs`). |
| `--spin-matte <mode>` | `imgly` | Spin background removal: `imgly` \| `rembg` \| `none`. |

## Idempotency

Re-running is safe. Each piece folder is processed **authoritatively** for its
asset fields (the generated entry reflects exactly the files present now, so
removing e.g. `alt.*` drops `alternateImage`), while the human-edited
`price`/`isSold` for that piece are **preserved** and other pieces' entries are
untouched. Unchanged inputs are skipped via an mtime check (use `--force` to
override). The generated JSON is sorted and stable, so re-running with the same
inputs produces no diff.

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
