"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The ticket's TOP image carousel — one photo at a time on the cream card,
 * shown in a 1:1 SQUARE area (its height tracks the ticket width).
 *
 * Implementation is a horizontal scroll-snap track so MOBILE gets native touch
 * SWIPE for free; the native scrollbar is hidden (`.hide-scrollbar`). Overlaid
 * near the bottom of the image is a row of DOTS — the active dot is filled neon
 * green (#03F94D), the rest are small ink-outlined circles. The active index is
 * derived from the track's scroll position (so swipe + autorotate + dot-clicks
 * all keep the dots in sync), and the deck AUTOROTATES every ~4s. On desktop
 * (where there's no swipe) clicking a dot scrolls to that photo.
 *
 * SSR-safe: starts at index 0 with no window access during render. Degrades to
 * a single static image (no dots / no autorotate) for one photo, and renders
 * nothing for zero.
 */
const AUTOROTATE_MS = 4000;

export function PhotoCarousel({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const count = images?.length ?? 0;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  };

  // Derive the active index from scroll position (covers swipe, dot taps, and
  // autorotate alike). rAF-debounced so rapid scroll events stay cheap.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count <= 1) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = track.clientWidth || 1;
        const idx = Math.round(track.scrollLeft / w);
        setActive(Math.max(0, Math.min(count - 1, idx)));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [count]);

  // Autorotate — advance to the next slide on a timer.
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      scrollToIndex((activeRef.current + 1) % count);
    }, AUTOROTATE_MS);
    return () => clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  return (
    <div className="relative w-full">
      <div
        ref={trackRef}
        className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {images.map((src, i) => (
          <div
            key={src}
            data-slide
            className="relative aspect-square w-full shrink-0 snap-center bg-[#FAF5ED]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${alt} — photo ${i + 1}`}
              loading={i === 0 ? undefined : "lazy"}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain p-4"
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to photo ${i + 1}`}
              aria-current={i === active}
              onClick={() => scrollToIndex(i)}
              className={`h-2.5 w-2.5 cursor-pointer rounded-full border transition-colors ${
                i === active
                  ? "border-[#03F94D] bg-[#03F94D]"
                  : "border-[#413E3F] bg-transparent"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
