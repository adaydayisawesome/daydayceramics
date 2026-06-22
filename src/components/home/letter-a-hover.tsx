"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";

import {
  A_SPIN,
  CREAM,
  HOVER_COLOR_MS,
  HOVER_CONTENT_DELAY_MS,
  INK,
  letterSize,
  letterStyle,
  SPIN_ASSET,
  SPIN_FALLBACK,
} from "./constants";
import { SpinningObject } from "./spinning-object";

type LetterAHoverProps = {
  active: boolean;
  coarse: boolean;
  onActiveChange: (active: boolean) => void;
};

export function LetterAHover({
  active,
  coarse,
  onActiveChange,
}: LetterAHoverProps) {
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setContentReady(false);
      return;
    }

    const timer = window.setTimeout(
      () => setContentReady(true),
      HOVER_CONTENT_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [active]);

  // Touch: first tap focuses (reveals); a second tap follows the link. Desktop
  // is unchanged. stopPropagation prevents the background "tap away" dismiss.
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (coarse && !active) {
      event.preventDefault();
      onActiveChange(true);
    }
  };

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      onMouseEnter={() => !coarse && onActiveChange(true)}
      onMouseLeave={() => !coarse && onActiveChange(false)}
    >
      <div className="relative inline-flex">
        <Link
          href="/collections/ugly-babies"
          aria-label="Ugly Babies"
          onClick={handleClick}
          className="relative z-10 inline-flex no-underline transition-colors ease-in-out"
          style={{
            color: active ? CREAM : INK,
            transitionDuration: `${HOVER_COLOR_MS}ms`,
          }}
        >
          <span
            aria-hidden
            className="block leading-none select-none font-[family-name:var(--font-anton)]"
            style={letterStyle}
          >
            A
          </span>
        </Link>

        {contentReady && (
          <>
            {/* Cup + depth shadow — em-based, scales with the letter and
                emerges from the counter on both desktop and mobile. */}
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{ fontSize: letterSize }}
              aria-hidden
            >
              {/* Depth "shadow": a copy of the A glyph filled with a vertical
                  transparent→black→transparent gradient via background-clip:text,
                  so it lands on the stroke by construction and only ever darkens
                  the letter, never the background. The clip is a strip following
                  ONLY the left diagonal leg (its right edge tracks the leg's inner
                  edge, measured from the font), so the crossbar and right leg are
                  excluded. The gradient is a contained, cup-centered band matched
                  to D's height. Tied to the letter shape, so it survives a cup
                  swap. */}
              <span
                aria-hidden
                className="d-hover-fade pointer-events-none absolute top-0 left-0 block leading-none select-none font-[family-name:var(--font-anton)]"
                style={{
                  ...letterStyle,
                  color: "transparent",
                  backgroundImage:
                    "linear-gradient(to bottom, transparent 27%, rgba(15,13,13,0.96) 49%, transparent 64%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  clipPath:
                    "polygon(16.5% 23.7%, 14.0% 36.5%, 11.5% 49.5%, 8.6% 62.3%, 6.2% 75.1%, 2.9% 92.3%, 37.1% 92.3%, 39.2% 79.5%, 40.5% 70.9%, 42.4% 62.3%, 44.1% 49.5%, 46.2% 36.5%, 48.2% 23.7%)",
                }}
              >
                A
              </span>

              {/*
                Cup — emerges from the A's inner counter (its right edge tracks the
                inner edge of the A's RIGHT stroke), slides right→left, and lands
                over the left leg with its left side hanging out past the A into
                the background. The slanted clip makes the cup read as filling the
                counter and sliding out from the cutout. Replaceable with other
                ceramic items.
              */}
              <div
                className="absolute top-[33%] right-[0.215em] left-[-0.13em] h-[0.33em]"
                style={{
                  clipPath: "polygon(0% 0%, 97.4% 0%, 102.95% 100%, 0% 100%)",
                }}
              >
                <div className="d-hover-cup relative h-full w-full">
                  {/* 360° spinner: rotates as it slides out, then settles on
                      A's chosen front frame. Falls back to the static cup if
                      the spin asset is missing. */}
                  <SpinningObject
                    name={SPIN_ASSET}
                    fallbackSrc={SPIN_FALLBACK}
                    active={active}
                    grayscale
                    rotations={A_SPIN.rotations}
                    settleFrame={A_SPIN.settleFrame}
                    className="absolute top-0 left-0 block h-full w-auto max-w-none"
                  />
                </div>
              </div>
            </div>

            {/* Text — right of A (desktop only) */}
            <div
              className="pointer-events-none absolute inset-0 z-30 max-md:hidden"
              style={{ fontSize: letterSize }}
              aria-hidden
            >
              <div className="d-hover-text absolute top-1/2 left-[calc(100%+24px)] z-30 w-[max-content] max-w-[46vw]">
                <p className="font-[family-name:var(--font-playfair)] text-[56px] leading-[1.05] font-extrabold italic tracking-[-0.01em] whitespace-nowrap text-[#F8F5EE]">
                  Ugly Babies
                </p>
                <p className="mt-3 max-w-[360px] font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal whitespace-normal text-[#F8F5EE]/85">
                  Early, odd, imperfect, and somehow still lovable.
                </p>
              </div>
            </div>

            {/* Text — centered below the letters (mobile only) */}
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[22%] z-30 px-6 md:hidden"
              aria-hidden
            >
              <div className="m-hover-text mx-auto max-w-[86vw] text-center">
                <p className="font-[family-name:var(--font-playfair)] text-[28px] leading-[1.1] font-extrabold italic tracking-[-0.01em] text-[#F8F5EE]">
                  Ugly Babies
                </p>
                <p className="mx-auto mt-2 max-w-[300px] font-[family-name:var(--font-figtree)] text-[15px] leading-[1.4] font-normal text-[#F8F5EE]/85">
                  Early, odd, imperfect, and somehow still lovable.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
