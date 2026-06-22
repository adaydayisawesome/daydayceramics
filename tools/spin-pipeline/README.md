# Spin Pipeline

Turns a **turntable spin video** (an object rotating 360° on a rotating
platform) into web assets for the home-page "360 spinner": a numbered
transparent **WebP frame sequence**, a packed **WebP sprite sheet**, and a
small **`manifest.json`**. Output lands in `public/images/spin/<name>/` and is
consumed by `src/components/home/spinning-object.tsx`.

## Quick start

```bash
node tools/spin-pipeline/build.mjs --input ~/Downloads/cup.mov --name cup-a --frames 36
```

This produces:

```
public/images/spin/cup-a/
  frames/frame_000.webp ... frame_NNN.webp   # transparent sequence
  sprite.webp                                # all frames packed in a grid (COLOR)
  sprite-print.webp                          # baked grainy B&W halftone "print"
  manifest.json                              # frameCount, size, cols/rows, settleFrame, spritePrint, ...
```

## What it does

1. **Extract frames** with `ffmpeg`. By default it pulls every source frame in
   the (optionally trimmed) range, then samples `--frames` of them evenly so the
   object is captured uniformly around the turn. Use `--fps` for fixed-rate
   sampling instead.
2. **Remove the background** of each frame to transparency. Swappable matter:
   - `imgly` (default) — `@imgly/background-removal-node`, pure Node.
   - `rembg` — shells out to the Python `rembg` CLI if you have it.
   - `none` — skips removal (keeps an alpha channel) for offline smoke tests.
3. **Auto-crop** to a single **union bounding box** computed across *all* frames
   (so the object stays put and doesn't jitter), optionally downscales to
   `--max` height, then writes the WebP sequence + sprite sheet + manifest.

Cropping/resizing/sprite-packing all use `sharp` (already a project dependency).

4. **Bake the "print" variant** (`treat.mjs`). After the color sprite is written,
   the pipeline applies a grainy black-and-white **halftone** treatment to the
   same cropped frames and writes `sprite-print.webp` (identical cols/rows/frame
   geometry), then records `spritePrint` in the manifest. The COLOR `sprite.webp`
   is left untouched — product/collection pages keep using it in full color,
   while the HOME spinner (letters **D**/**A**) renders the baked B&W print.

## The B&W halftone "print" treatment (`treat.mjs`)

The home-page spinner shows the cup as a photocopied-zine print: a vintage tonal
curve, classic **AM halftone dots** on a ~45° screen, and **film grain**. The
ORIGINAL matte alpha is preserved exactly, so the object still floats over the
dark page (no opaque paper rectangle). The B&W is **baked into the pixels**, so
the component applies no CSS `grayscale` filter for this variant.

Run it standalone over an existing asset's frames (fast — no video needed):

```bash
node tools/spin-pipeline/treat.mjs --name cup-a
# write a sample PNG to eyeball the dots/grain/tone:
node tools/spin-pipeline/treat.mjs --name cup-a --sample /tmp/print-sample.png
```

It is also imported by `build.mjs`, so a full pipeline run emits both `sprite.webp`
and `sprite-print.webp` in one go.

### Treatment knobs

Defaults live in `PRINT_DEFAULTS` (in `treat.mjs`) and lean "vintage, slightly
rough." Override per run with flags:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--dot <px>` | `6` | Halftone dot cell size in **source** px (frames ~617×480, scaled down on screen). Smaller = finer dots. |
| `--angle <deg>` | `45` | Screen rotation. |
| `--aa <frac>` | `0.16` | Dot-edge softness (ink-bleed feel vs. crisp vector dots). |
| `--grain <amt>` | `0.16` | Screen grain/roughness (breaks up the dot grid → photocopied). |
| `--final-grain <amt>` | `0.05` | Faint final luminance grain. |
| `--contrast <x>` | `1.28` | Contrast punch around mid-grey. |
| `--gamma <x>` | `1.18` | Midtone lift (keeps detail; avoids a black silhouette). |
| `--in-black <0..1>` | `0.1` | Levels black point (crush blacks). |
| `--in-white <0..1>` | `0.92` | Levels white point (blow highlights). |
| `--sample <path>` | — | Also write a single treated PNG for inspection. |

## Options

| Flag | Default | Meaning |
| --- | --- | --- |
| `--input <path>` | — | **Required.** Source video (`~` is expanded). |
| `--name <name>` | — | **Required.** Output dir `public/images/spin/<name>/`. |
| `--frames <N>` | `36` | Frames to sample. Capped at the source frame count. |
| `--fps <rate>` | — | Sample at a fixed fps instead of N evenly-spaced frames. |
| `--start <sec>` | `0` | Trim start. |
| `--end <sec>` | clip end | Trim end. |
| `--matte <mode>` | `imgly` | `imgly` \| `rembg` \| `none`. |
| `--max <px>` | `480` | Max frame height; downscale to fit. |
| `--pad <pct>` | `4` | Padding around the union bbox. |
| `--cols <n>` | `ceil(sqrt(N))` | Sprite-sheet columns. |
| `--turns <n>` | `1` | Physical rotations captured in the clip (manifest metadata). |
| `--settle <i>` | `0` | Default front/settle frame index (manifest metadata). |
| `--out <dir>` | `public/images/spin` | Output root. |
| `--keep-tmp` | off | Keep the intermediate working dir for debugging. |

## Dependencies

- `ffmpeg-static` + `ffprobe-static` — bundled ffmpeg/ffprobe binaries (no
  system `ffmpeg` needed). Installed as devDependencies.
- `@imgly/background-removal-node` — default background remover (devDependency).
- `sharp` — crop / resize / sprite packing (already a dependency).

Install the pipeline deps:

```bash
npm install -D ffmpeg-static ffprobe-static @imgly/background-removal-node
```

### ⚠️ Network / sandbox caveat for background removal

The **background-removal step needs network on first run** and is the only part
that may fail in a restricted sandbox:

- `@imgly/background-removal-node` downloads an ONNX segmentation model (~tens of
  MB) the first time it runs; it caches under `node_modules`.
- `npm install` of the matte dependency also needs network.

If you are in a sandboxed/agent environment, run the install and the pipeline
**with elevated network permissions** (e.g. the agent's
`required_permissions: ["all"]`). The `rembg` mode has the same caveat (it
downloads its U²-Net model on first use). Use `--matte none` for a fully offline
smoke test (no transparency).

## Re-running on a new video

1. Drop the new turntable clip anywhere (e.g. `~/Downloads/my-spin.mp4`).
2. Run:

   ```bash
   node tools/spin-pipeline/build.mjs --input ~/Downloads/my-spin.mp4 --name cup-a --frames 24
   ```

   Re-using `--name cup-a` overwrites the existing asset in place, so both the
   **D** and **A** letters pick up the new object with no code change.
3. Rebuild the site (`npm run build`) and restart the preview.

Tune `--frames` (smoothness vs. weight), `--turns` (if the clip contains more
than one physical rotation), and `--settle` (which frame the object rests on).
The component can also override the settle frame per letter — see
`src/components/home/constants.ts`.
