"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Shared turntable-sprite primitives, factored out of `SpinningObject` so the
 * V2 home page can render many auto-rotating cells without duplicating the
 * manifest-loading or sprite-position math. `SpinningObject` (V1) is built on
 * the exact same helpers, so its behavior is unchanged.
 */

export type Manifest = {
  name: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  sprite: string;
  /** Optional baked grainy B&W halftone "print" sprite (home page). */
  spritePrint?: string;
  settleFrame?: number;
};

// Module-level caches so repeat reveals/cells are instant (no re-fetch) and
// shared across every consumer that uses the same asset name.
const manifestCache = new Map<string, Manifest>();
const manifestPromises = new Map<string, Promise<Manifest | null>>();

export function spinDir(name: string) {
  return `/images/spin/${name}`;
}

export function loadManifest(name: string): Promise<Manifest | null> {
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
      // Warm the sprite(s) in the browser cache so the first frame is instant.
      // Warm the baked print variant too when present (the home page uses it).
      if (typeof window !== "undefined") {
        const img = new window.Image();
        img.src = `${spinDir(name)}/${m.sprite}`;
        if (m.spritePrint) {
          const imgPrint = new window.Image();
          imgPrint.src = `${spinDir(name)}/${m.spritePrint}`;
        }
      }
      return m;
    })
    .catch(() => null);

  manifestPromises.set(name, p);
  return p;
}

/**
 * Resolve a manifest by name (cached). Returns `null` while loading and
 * `"failed"` if the manifest is missing/broken.
 */
export function useManifest(name?: string): Manifest | null | "failed" {
  const [manifest, setManifest] = useState<Manifest | null>(() =>
    name ? (manifestCache.get(name) ?? null) : null
  );
  const [failed, setFailed] = useState(false);

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

  if (!name || failed) return "failed";
  return manifest;
}

/**
 * Background style that positions a single turntable frame from the sprite
 * sheet. Shared by `SpinningObject` and `AutoSpinCell`.
 */
export function spriteCellStyle({
  manifest,
  name,
  frame,
  print = false,
  grayscale = false,
}: {
  manifest: Manifest;
  name: string;
  frame: number;
  print?: boolean;
  grayscale?: boolean;
}): CSSProperties {
  const { cols, rows, frameWidth, frameHeight, sprite, spritePrint } = manifest;
  // Prefer the baked halftone print sprite when requested and available (its
  // B&W is baked in, so no CSS filter). Otherwise fall back to the color sprite
  // with an optional CSS grayscale, so the home page never shows color.
  const usePrint = print && Boolean(spritePrint);
  const activeSprite = usePrint ? spritePrint! : sprite;
  const grayscaleFilter = grayscale || print ? "grayscale(1)" : undefined;
  const filter = usePrint ? undefined : grayscaleFilter;

  const n = manifest.frameCount || 1;
  const f = (((frame % n) + n) % n) | 0;
  const col = f % cols;
  const row = Math.floor(f / cols);
  const posX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
  const posY = rows > 1 ? (row / (rows - 1)) * 100 : 0;

  return {
    aspectRatio: `${frameWidth} / ${frameHeight}`,
    backgroundImage: `url(${spinDir(name)}/${activeSprite})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
    filter,
  };
}

/**
 * Single shared animation ticker: one rAF loop that advances an integer frame
 * counter at roughly `fps`, throttled so we only re-render on a frame change.
 * Every cell in the V2 grid reads from this one counter (plus a per-cell phase
 * offset), so 18 cells animate from a SINGLE loop rather than 18 of their own.
 */
export function useSharedSpinTick(fps = 12) {
  const [tick, setTick] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    let last = performance.now();
    const step = 1000 / fps;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < step) return;
      // Catch up by however many steps elapsed (keeps a steady cadence).
      const advance = Math.floor((now - last) / step);
      last += advance * step;
      frameRef.current += advance;
      setTick(frameRef.current);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fps]);

  return tick;
}

/**
 * One continuously-rotating turntable cell for the V2 home grid. Pure display:
 * it renders whatever `frame` it's handed (the parent's shared ticker decides
 * the frame), so all cells stay driven by a single loop.
 */
export function AutoSpinCell({
  name,
  frame,
  print = false,
  grayscale = false,
  className,
}: {
  name: string;
  frame: number;
  print?: boolean;
  grayscale?: boolean;
  className?: string;
}) {
  const manifestState = useManifest(name);
  const manifest = manifestState === "failed" ? null : manifestState;

  // Until the manifest resolves, render an empty (transparent) box so the grid
  // keeps its layout without a flash of a broken sprite.
  if (!manifest) return <div aria-hidden className={className} />;

  return (
    <div
      aria-hidden
      className={className}
      style={spriteCellStyle({ manifest, name, frame, print, grayscale })}
    />
  );
}
