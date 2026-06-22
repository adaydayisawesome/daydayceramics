"use client";

import { useEffect, useRef, useState } from "react";

import { SLIDE_MS } from "./constants";

/**
 * Frame-player for the home-page "360 spinner".
 *
 * Loads a turntable asset produced by tools/spin-pipeline (a sprite sheet +
 * manifest under /images/spin/<name>/) and renders the current frame by moving
 * the sprite-sheet background-position. The frame index is driven over the
 * cup slide-out window so the object appears to rotate as it slides, then
 * settles on a chosen "front" frame.
 *
 * If no `name` is given, or the manifest fails to load, it renders the plain
 * static `<img src={fallbackSrc}>` — i.e. exactly the previous behavior. This
 * keeps the live site working even when no spin asset is present.
 */

type Manifest = {
  name: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  sprite: string;
  settleFrame?: number;
};

// Module-level caches so the 2nd+ reveal is perfectly in sync with the slide
// (no manifest/sprite fetch latency). Shared across letters that use the same
// asset name.
const manifestCache = new Map<string, Manifest>();
const manifestPromises = new Map<string, Promise<Manifest | null>>();

function spinDir(name: string) {
  return `/images/spin/${name}`;
}

function loadManifest(name: string): Promise<Manifest | null> {
  if (manifestCache.has(name)) {
    return Promise.resolve(manifestCache.get(name)!);
  }
  if (manifestPromises.has(name)) return manifestPromises.get(name)!;

  const p = fetch(`${spinDir(name)}/manifest.json`, { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      return res.json() as Promise<Manifest>;
    })
    .then((m) => {
      manifestCache.set(name, m);
      // Warm the sprite in the browser cache so the first frame is instant.
      if (typeof window !== "undefined") {
        const img = new window.Image();
        img.src = `${spinDir(name)}/${m.sprite}`;
      }
      return m;
    })
    .catch(() => null);

  manifestPromises.set(name, p);
  return p;
}

// ease-in-out (sine) — visually matches the CSS `ease-in-out` slide closely.
function easeInOut(t: number) {
  return 0.5 * (1 - Math.cos(Math.PI * t));
}

type SpinningObjectProps = {
  /** Spin asset name -> /images/spin/<name>/. Omit to force the static image. */
  name?: string;
  /** Static image shown when no spin asset is available. */
  fallbackSrc: string;
  alt?: string;
  /** Applied to the rendered element (positioning + h-full, like the old img). */
  className?: string;
  /** Whether the reveal is active; drives the spin when it becomes true. */
  active: boolean;
  /** Play the spin (default true). When false, rests on the settle frame. */
  spin?: boolean;
  /** Full turns to play during the slide-out (default 1). */
  rotations?: number;
  /** Slide duration to sync to, ms (default SLIDE_MS / `.d-hover-cup`). */
  durationMs?: number;
  /** Frame to settle on; overrides manifest.settleFrame. */
  settleFrame?: number;
  /** Render the object in black & white (the source frames stay full color, so
   *  product pages can reuse the same asset in color). */
  grayscale?: boolean;
};

export function SpinningObject({
  name,
  fallbackSrc,
  alt = "",
  className,
  active,
  spin = true,
  rotations = 1,
  durationMs = SLIDE_MS,
  settleFrame,
  grayscale = false,
}: SpinningObjectProps) {
  const filter = grayscale ? "grayscale(1)" : undefined;
  const [manifest, setManifest] = useState<Manifest | null>(() =>
    name ? (manifestCache.get(name) ?? null) : null
  );
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Resolve the manifest (cached after first load). The setState calls happen
  // inside an async `.then`, never synchronously in the effect body.
  useEffect(() => {
    if (!name || manifest) return;
    let alive = true;
    loadManifest(name).then((m) => {
      if (!alive) return;
      if (m) setManifest(m);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [name, manifest]);

  const n = manifest?.frameCount ?? 1;
  const settle = settleFrame ?? manifest?.settleFrame ?? 0;
  const land = ((settle % n) + n) % n;

  // QA/tuning override: `?spinMs=<ms>` slows (or speeds) the spin so the
  // rotation is easy to observe/screenshot. No effect on markup, so no
  // hydration mismatch; ignored when absent.
  let effectiveDuration = durationMs;
  if (typeof window !== "undefined") {
    const q = Number(new URLSearchParams(window.location.search).get("spinMs"));
    if (Number.isFinite(q) && q > 0) effectiveDuration = q;
  }

  // Drive the frame index over the slide window, then settle. All setState
  // happens inside the rAF callback (async), satisfying react-hooks rules.
  useEffect(() => {
    if (!manifest || !active || !spin) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / effectiveDuration);
      const steps = Math.round(easeInOut(p) * rotations * n);
      setFrame((((land + steps) % n) + n) % n);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setFrame(land);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [manifest, active, spin, rotations, effectiveDuration, n, land]);

  // While idle (not actively spinning) show the settle frame; during the
  // slide the rAF-driven `frame` state takes over.
  const displayFrame = active && spin ? frame : land;

  // Fallback to the static image when:
  //   - no asset name is configured, or
  //   - the manifest failed to load (asset missing/broken), or
  //   - the manifest is still loading on the very first reveal (avoids a blank
  //     gap; swaps to the sprite once ready, then cached for next time).
  // This is identical to the original cup rendering, so the site never breaks.
  if (!name || failed || !manifest) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        style={{ filter }}
        draggable={false}
      />
    );
  }

  const { cols, rows, frameWidth, frameHeight, sprite } = manifest;
  const col = displayFrame % cols;
  const row = Math.floor(displayFrame / cols);
  const posX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const posY = rows > 1 ? (row / (rows - 1)) * 100 : 0;

  return (
    <div
      aria-hidden
      className={className}
      style={{
        // Match the old `h-full w-auto` img: height fills the slide box, width
        // follows the frame aspect ratio.
        height: "100%",
        width: "auto",
        aspectRatio: `${frameWidth} / ${frameHeight}`,
        backgroundImage: `url(${spinDir(name)}/${sprite})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${cols * 100}% ${rows * 100}%`,
        backgroundPosition: `${posX}% ${posY}%`,
        filter,
      }}
    />
  );
}
