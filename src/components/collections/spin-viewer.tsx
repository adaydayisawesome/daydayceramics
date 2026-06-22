"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpinManifest = {
  frameCount: number;
  sequence: string; // e.g. "frames/frame_%03d.webp"
  settleFrame?: number;
};

type Status = "idle" | "loading" | "ready" | "unavailable";

function frameUrl(base: string, sequence: string, index: number): string {
  // Replace a printf-style %0Nd token with the zero-padded frame index.
  const url = sequence.replace(/%0?(\d+)d/, (_m, width: string) =>
    String(index).padStart(Number(width), "0"),
  );
  return `${base.replace(/\/$/, "")}/${url}`;
}

/**
 * 360° spin viewer for `spin360` products.
 *
 * Renders the static `fallbackImage` until the viewer is "active" (hovered).
 * On first activation it fetches `${spinMedia}/manifest.json`; if that manifest
 * (or its first frame) is missing/unavailable the component degrades gracefully
 * and simply keeps showing the static image — no spin, no error surface. This
 * is the expected state on a clean checkout, since real spin assets are
 * produced by a separate pipeline and are gitignored.
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
  const [frames, setFrames] = useState<string[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const loadManifest = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${spinMedia.replace(/\/$/, "")}/manifest.json`, {
        cache: "force-cache",
      });
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      const manifest = (await res.json()) as SpinManifest;
      if (!manifest.frameCount || !manifest.sequence) {
        throw new Error("invalid manifest");
      }
      const urls = Array.from({ length: manifest.frameCount }, (_, i) =>
        frameUrl(spinMedia, manifest.sequence, i),
      );
      // Verify the first frame actually loads before committing to spin mode.
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("frame load failed"));
        img.src = urls[0];
      });
      // Warm the rest of the sequence so playback is smooth.
      urls.forEach((u) => {
        const img = new Image();
        img.src = u;
      });
      setFrames(urls);
      setFrameIndex(manifest.settleFrame ?? 0);
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
    if (!active || status !== "ready" || frames.length === 0) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const FRAME_MS = 1000 / 24; // ~24fps turntable
    const step = (now: number) => {
      if (now - lastTickRef.current >= FRAME_MS) {
        lastTickRef.current = now;
        setFrameIndex((i) => (i + 1) % frames.length);
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, status, frames]);

  // Only show spin frames while actively hovered; otherwise return to static.
  const showSpin = active && status === "ready" && frames.length > 0;
  const src = showSpin
    ? frames[Math.min(frameIndex, frames.length - 1)]
    : fallbackImage;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`absolute inset-0 h-full w-full object-contain p-[10%] ${
        grayscale ? "grayscale" : ""
      }`}
    />
  );
}
