"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";

import {
  CREAM,
  HOVER_COLOR_MS,
  HOVER_CONTENT_DELAY_MS,
  INK,
  letterSize,
  letterStyle,
} from "./constants";

type LetterDHoverProps = {
  active: boolean;
  coarse: boolean;
  onActiveChange: (active: boolean) => void;
};

export function LetterDHover({
  active,
  coarse,
  onActiveChange,
}: LetterDHoverProps) {
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

  // Touch: first tap focuses (reveals) the letter and stays; a second tap on
  // the now-active letter follows the link. Desktop is unchanged (hover
  // reveals, click navigates). stopPropagation keeps the background "tap away"
  // dismiss from firing when the glyph itself is tapped.
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
          href="/collections/tableware"
          aria-label="Tableware"
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
            D
          </span>
        </Link>

        {contentReady && (
          <>
            {/* Cup + depth gradient — em-based, so it scales with the letter
                and emerges from the counter on both desktop and mobile. */}
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{ fontSize: letterSize }}
              aria-hidden
            >
              {/* Depth gradients above and below the cup, on the 1st (left) stroke */}
              {/* Single continuous strip on the 1st stroke (x 0.035em–0.215em),
                  centered on the cup: transparent → black → transparent so the
                  dark core always sits behind the cup with no gap, regardless of
                  which cup image is used. */}
              <div
                className="d-hover-fade absolute top-[15%] left-[0.035em] h-[72%] w-[0.18em]"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, rgba(15,13,13,0.96) 50%, transparent)",
                }}
              />

              {/*
                Cup — starts hidden behind 2nd stroke (right curve), slides
                right→left, lands centered on the 1st stroke with its left
                side hanging out past the D into the background.
              */}
              <div className="absolute top-[35%] right-[0.21em] left-[-0.13em] h-[0.33em] overflow-hidden">
                <div className="d-hover-cup relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/tea-cup.png"
                    alt=""
                    className="absolute top-0 left-0 block h-full w-auto max-w-none"
                    draggable={false}
                  />
                </div>
              </div>
            </div>

            {/* Text — right of D (desktop only) */}
            <div
              className="pointer-events-none absolute inset-0 z-30 max-md:hidden"
              style={{ fontSize: letterSize }}
              aria-hidden
            >
              <div className="d-hover-text absolute top-1/2 left-[calc(100%+24px)] z-30 w-[max-content] max-w-[46vw]">
                <p className="font-[family-name:var(--font-playfair)] text-[56px] leading-[1.05] font-extrabold italic tracking-[-0.01em] whitespace-nowrap text-[#F8F5EE]">
                  Darling Babies
                </p>
                <p className="mt-3 max-w-[400px] font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal whitespace-normal text-[#F8F5EE]/85">
                  Polished, well-loved, thoughtful, and somehow survived my
                  picky heart.
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
                  Darling Babies
                </p>
                <p className="mx-auto mt-2 max-w-[300px] font-[family-name:var(--font-figtree)] text-[15px] leading-[1.4] font-normal text-[#F8F5EE]/85">
                  Polished, well-loved, thoughtful, and somehow survived my
                  picky heart.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
