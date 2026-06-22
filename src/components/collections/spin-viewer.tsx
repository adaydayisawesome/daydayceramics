"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpinManifest = {
  frameCount: number;
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  sprite: string; // e.g. "sprite.webp"
  settleFrame?: number;
};

type Spin = {
  frameCount: number;
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  spriteUrl: string;
  settleFrame: number;
};

type Status = "idle" | "loading" | "ready" | "unavailable";

/**
 * 360° spin viewer for `spin360` products.
 *
 * Renders the static `fallbackImage` until the viewer is "active" (hovered).
 * On first activation it fetches `${spinMedia}/manifest.json` and plays the spin
 * by moving the background-position across the packed SPRITE SHEET (the same
 * committed asset the home spinner uses).
 *
 * IMPORTANT: this intentionally uses the sprite, NOT the per-frame sequence.
 * The individual `frames/` are gitignored (kept out of the repo to stay light),
 * so they are not deployed — only `sprite.webp` + `manifest.json` are. Rendering
 * from the sprite is therefore what makes the spin work in production.
 *
 * If the manifest or sprite is missing/unavailable the component degrades
 * gracefully and simply keeps showing the static image — no spin, no error.
 */
export function SpinViewer({
  spinMedia,
  fallbackImage,
  alt,
  active,
  grayscale,
}: {
  spinMedia: string;
  fallbackImage: string;
  alt: string;
  active: boolean;
  grayscale?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [spin, setSpin] = useState<Spin | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const loadManifest = useCallback(async () => {
    setStatus("loading");
    try {
      const base = spinMedia.replace(/\/$/, "");
      const res = await fetch(`${base}/manifest.json`, { cache: "force-cache" });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      const m = (await res.json()) as SpinManifest;
      if (!m.frameCount || !m.sprite || !m.cols || !m.rows) {
        throw new Error("invalid manifest");
      }
      const spriteUrl = `${base}/${m.sprite}`;
      // Verify the sprite actually loads before committing to spin mode.
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("sprite load failed"));
        img.src = spriteUrl;
      });
      setSpin({
        frameCount: m.frameCount,
        cols: m.cols,
        rows: m.rows,
        frameWidth: m.frameWidth,
        frameHeight: m.frameHeight,
        spriteUrl,
        settleFrame: m.settleFrame ?? 0,
      });
      setFrameIndex(m.settleFrame ?? 0);
      setStatus("ready");
    } catch {
      setStatus("unavailable");
    }
  }, [spinMedia]);

  // Lazily load the manifest the first time the cell is activated.
  useEffect(() => {
    if (active && status === "idle") void loadManifest();
  }, [active, status, loadManifest]);

  // Drive frame playback while active.
  useEffect(() => {
    if (!active || status !== "ready" || !spin) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const FRAME_MS = 1000 / 24; // ~24fps turntable
    const step = (now: number) => {
      if (now - lastTickRef.current >= FRAME_MS) {
        lastTickRef.current = now;
        setFrameIndex((i) => (i + 1) % spin.frameCount);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, status, spin]);

  const showSpin = active && status === "ready" && spin !== null;

  if (showSpin && spin) {
    const idx = Math.min(frameIndex, spin.frameCount - 1);
    const col = idx % spin.cols;
    const row = Math.floor(idx / spin.cols);
    const posX = spin.cols > 1 ? (col / (spin.cols - 1)) * 100 : 0;
    const posY = spin.rows > 1 ? (row / (spin.rows - 1)) * 100 : 0;
    return (
      // Same footprint as the static <img object-contain p-[10%]>: the sprite
      // tile keeps the frame's aspect ratio and is contained within the cell.
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center p-[10%]"
      >
        <div
          className={grayscale ? "grayscale" : ""}
          style={{
            width: "100%",
            maxHeight: "100%",
            aspectRatio: `${spin.frameWidth} / ${spin.frameHeight}`,
            backgroundImage: `url(${spin.spriteUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${spin.cols * 100}% ${spin.rows * 100}%`,
            backgroundPosition: `${posX}% ${posY}%`,
          }}
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fallbackImage}
      alt={alt}
      draggable={false}
      className={`absolute inset-0 h-full w-full object-contain p-[10%] ${
        grayscale ? "grayscale" : ""
      }`}
    />
  );
}
