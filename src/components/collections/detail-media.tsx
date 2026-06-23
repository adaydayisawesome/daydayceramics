"use client";

import { useState } from "react";
import { SpinViewer } from "./spin-viewer";

/**
 * Product DETAIL media: a featured tile plus a gallery of every photo.
 *
 * The featured tile reuses the grid's `SpinViewer` for `spin360` pieces — it
 * shows the matted (transparent) hero by default and plays the 360° turntable
 * on hover, exactly like the collection grid. Below it, the full gallery shows
 * each `detailImages` photo with its ORIGINAL background (these are intentionally
 * NOT matted), so the detail page presents everything that shipped with the
 * piece. Falls back to the single `defaultImage` when there are no gallery
 * photos.
 */
export function DetailMedia({
  title,
  defaultImage,
  detailImages,
  detailVideos = [],
  spinMedia,
  hoverType,
  isSold,
}: {
  title: string;
  defaultImage: string;
  detailImages: string[];
  detailVideos?: string[];
  spinMedia: string | null;
  hoverType: string;
  isSold: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const grayscale = isSold ? "grayscale" : "";
  const hasSpin = hoverType === "spin360" && Boolean(spinMedia);

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {/* Featured tile — matted hero, 360 spin on hover for spin360 pieces. */}
      <div
        className="group relative aspect-square w-full"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hasSpin && spinMedia ? (
          <SpinViewer
            spinMedia={spinMedia}
            fallbackImage={defaultImage}
            alt={title}
            active={hovered}
            grayscale={isSold}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={defaultImage}
            alt={title}
            className={`absolute inset-0 h-full w-full object-contain p-[8%] ${grayscale}`}
          />
        )}
        {hasSpin && (
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.08em] text-neutral-400 uppercase opacity-100 transition-opacity duration-300 group-hover:opacity-0">
            hover to spin
          </span>
        )}
      </div>

      {/* Gallery — every photo (original background kept, not matted) plus any
          extra clips that shipped with the piece, rendered as inline muted
          players so nothing from the drop is hidden. */}
      {(detailImages.length > 0 || detailVideos.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {detailImages.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-md bg-neutral-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${title} — view ${i + 1}`}
                loading="lazy"
                className={`absolute inset-0 h-full w-full object-cover ${grayscale}`}
              />
            </div>
          ))}
          {detailVideos.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-md bg-neutral-50"
            >
              <video
                src={src}
                muted
                controls
                playsInline
                loop
                preload="metadata"
                aria-label={`${title} — video ${i + 1}`}
                className={`absolute inset-0 h-full w-full object-cover ${grayscale}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
