"use client";

import { useEffect, useState, type MouseEvent } from "react";

import {
  CREAM,
  HOVER_COLOR_MS,
  HOVER_CONTENT_DELAY_MS,
  INK,
  letterSize,
  letterStyle,
} from "./constants";

type LetterYHoverProps = {
  active: boolean;
  coarse: boolean;
  onActiveChange: (active: boolean) => void;
  onOpen: () => void;
};

export function LetterYHover({
  active,
  coarse,
  onActiveChange,
  onOpen,
}: LetterYHoverProps) {
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

  // Touch: first tap focuses (reveals) the Y; a second tap on the active Y
  // opens the About interstitial. Desktop: hover reveals, click opens.
  // stopPropagation prevents the background "tap away" dismiss.
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (coarse && !active) {
      onActiveChange(true);
      return;
    }
    onOpen();
  };

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      onMouseEnter={() => !coarse && onActiveChange(true)}
      onMouseLeave={() => !coarse && onActiveChange(false)}
    >
      <div className="relative inline-flex">
        <button
          type="button"
          aria-label="About"
          onClick={handleClick}
          className="relative z-10 inline-flex cursor-pointer bg-transparent p-0 transition-colors ease-in-out"
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
            Y
          </span>
        </button>

        {contentReady && (
          <>
            {/* Text — left of Y, slides in from the right (desktop only) */}
            <div
              className="pointer-events-none absolute inset-0 z-20 max-md:hidden"
              style={{ fontSize: letterSize }}
              aria-hidden
            >
              <div className="y-hover-text absolute top-1/2 right-[calc(100%+28px)] z-30 w-[max-content] max-w-[46vw] text-right">
                <p className="font-[family-name:var(--font-playfair)] text-[56px] leading-[1.05] font-extrabold italic tracking-[-0.01em] whitespace-nowrap text-[#F8F5EE]">
                  Why Babies?
                </p>
                <p className="mt-3 ml-auto max-w-[420px] font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal whitespace-normal text-[#F8F5EE]/85">
                  Every piece here is handmade by me, one at a time, as part of
                  my ongoing exploration in functional ceramics: objects meant
                  to be used, held, lived with, and hopefully loved.
                </p>
                <p className="mt-6 font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal text-[#F8F5EE]/85">
                  Click on Y to learn more.
                </p>
              </div>
            </div>

            {/* Text — centered below the letters (mobile only).
                Anchored lower than D/A (15.5% vs 22%) because this block is
                taller (three lines): bottom-anchoring a taller block would push
                its top up toward the letter, so the offset is tuned so the
                letter→text gap matches D/A (~73px at 390×844) while keeping
                comfortable clearance above the footer. */}
            <div
              className="pointer-events-none fixed inset-x-0 bottom-[15.5%] z-30 px-6 md:hidden"
              aria-hidden
            >
              <div className="m-hover-text mx-auto max-w-[86vw] text-center">
                <p className="font-[family-name:var(--font-playfair)] text-[28px] leading-[1.1] font-extrabold italic tracking-[-0.01em] text-[#F8F5EE]">
                  Why Babies?
                </p>
                <p className="mx-auto mt-2 max-w-[320px] font-[family-name:var(--font-figtree)] text-[15px] leading-[1.4] font-normal text-[#F8F5EE]/85">
                  Every piece here is handmade by me, one at a time, as part of
                  my ongoing exploration in functional ceramics.
                </p>
                <p className="mt-3 font-[family-name:var(--font-figtree)] text-[15px] leading-[1.4] font-normal text-[#F8F5EE]/85">
                  Tap Y again to learn more.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
