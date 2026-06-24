"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A compact photo carousel for the adoption Q2 step.
 *
 * One image is shown at a time inside a horizontal scroll-snap track:
 *   · Mobile — native touch SWIPE (the track is `overflow-x-auto` with
 *     `snap-x snap-mandatory`); the scrollbar is hidden. No arrows.
 *   · Desktop — circular arrow buttons (site styling) that programmatically
 *     scroll the track by one slide.
 *
 * Sizes to the content-hugging dialog: each slide is the full track width at a
 * fixed height, `object-contain` on cream, rounded corners. Degrades to a plain
 * single image (no arrows) for one photo, and renders nothing for zero.
 */
const GAP_PX = 12; // matches the `gap-3` track gap

export function PhotoCarousel({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) return null;

  const scrollByItem = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelector<HTMLElement>("[data-slide]");
    const step = (slide?.clientWidth ?? track.clientWidth) + GAP_PX;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const showArrows = images.length > 1;

  return (
    <div className="relative w-full">
      <div
        ref={trackRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
      >
        {images.map((src, i) => (
          <div
            key={src}
            data-slide
            className="relative h-56 w-full shrink-0 snap-center overflow-hidden rounded-xl bg-[#FAF5ED] sm:h-64"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${alt} — photo ${i + 1}`}
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => scrollByItem(-1)}
            className="absolute top-1/2 left-2 hidden h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-[#FAF5ED]/85 transition-colors hover:bg-[#03F94D] sm:flex"
          >
            <ChevronLeft className="size-5 text-[#413E3F]" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => scrollByItem(1)}
            className="absolute top-1/2 right-2 hidden h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-[#FAF5ED]/85 transition-colors hover:bg-[#03F94D] sm:flex"
          >
            <ChevronRight className="size-5 text-[#413E3F]" />
          </button>
        </>
      )}
    </div>
  );
}
