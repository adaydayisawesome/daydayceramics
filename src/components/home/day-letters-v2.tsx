"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AboutInterstitial } from "./about-interstitial";
import { CREAM, D_SPIN_ASSET, SPIN_ASSET } from "./constants";
import { HomeFooter } from "./home-footer";
import { AutoSpinCell, useSharedSpinTick } from "./sprite-cell";

const GRID_COLS = 6;
const GRID_ROWS = 3;
const GRID_CELLS = GRID_COLS * GRID_ROWS; // 18

// Hand-drawn DAY art, same canvas/registration so they overlay in place.
// Derived by tools/asset-pipeline/day-outline.mjs:
//   day-outline.webp     — thin dark strokes (always on top).
//   day-fill-marker.webp — neon-green marker scribble (fades in on hover).
const DAY_OUTLINE = "/images/home-v2/day-outline.webp";
const DAY_FILL_MARKER = "/images/home-v2/day-fill-marker.webp";

/**
 * V2 home page.
 *
 * - Hand-drawn OUTLINE "DAY", centered exactly like V1's letters.
 * - Behind it, a 6×3 grid of the two halftone turntable objects (cup-a/cup-d),
 *   alternating and auto-rotating continuously, all driven by a SINGLE shared
 *   ticker with a per-cell phase offset so they're out of sync.
 * - Hovering anywhere on the DAY fades in a neon-green marker scribble fill
 *   behind the strokes (whole word at once), with the dark outline kept on top
 *   so the strokes stay crisp over the green. The entire DAY is one link to
 *   /collections/darling-babies; on touch devices (no hover) a tap navigates.
 * - The footer "Day Day Ceramics" brand opens the About interstitial.
 *
 * No per-letter hover reveals, and the background never flips to INK.
 */
export function DayLettersV2() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const tick = useSharedSpinTick(12);

  // Keep the page background CREAM (it may have been left INK by V1's hover
  // effect before switching versions).
  useEffect(() => {
    document.documentElement.style.backgroundColor = CREAM;
    document.body.style.backgroundColor = CREAM;
  }, []);

  return (
    <main
      className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden"
      style={{ backgroundColor: CREAM }}
    >
      <h1 className="sr-only">Day Day Ceramics</h1>

      {/* Spin grid — fills the viewport behind the DAY, kept low-key so the
          word reads clearly on top. One shared ticker drives all cells.
          Desktop: 6 cols × 3 rows. Mobile (portrait): 3 cols × 6 rows with
          larger objects. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 grid grid-cols-3 grid-rows-6 opacity-55 md:grid-cols-6 md:grid-rows-3"
      >
        {Array.from({ length: GRID_CELLS }, (_, i) => {
          // Alternate the two objects in a checkerboard so neighbors differ on
          // both axes; stagger each cell's phase so they're never all in sync.
          const row = Math.floor(i / GRID_COLS);
          const useD = (i + row) % 2 === 0;
          const phase = (i * 5) % 24;
          return (
            <div key={i} className="flex items-center justify-center">
              <AutoSpinCell
                name={useD ? D_SPIN_ASSET : SPIN_ASSET}
                frame={tick + phase}
                print
                grayscale
                className="h-auto w-[clamp(96px,28vw,190px)] md:w-[clamp(56px,11vw,150px)]"
              />
            </div>
          );
        })}
      </div>

      {/* DAY — single link target, sized to a comparable footprint to V1's
          letters and centered the same way. On hover the green marker fill
          fades in behind the strokes (whole word at once). */}
      <Link
        href="/collections/darling-babies"
        aria-label="Darling Babies"
        className="group relative z-10 block w-[min(86vw,960px)] no-underline"
        style={{ aspectRatio: "1400 / 950" }}
      >
        {/* Bottom: neon-green marker scribble fill — hidden until hover. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={DAY_FILL_MARKER}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 ease-in-out select-none group-hover:opacity-100"
        />
        {/* Top: dark outline — always visible so the strokes stay crisp over
            the green. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={DAY_OUTLINE}
          alt="DAY"
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain opacity-100 select-none"
        />
      </Link>

      {/* Footer stays visually unchanged; its brand opens the About dialog. */}
      <HomeFooter active={false} onBrandClick={() => setAboutOpen(true)} />

      <AboutInterstitial open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
