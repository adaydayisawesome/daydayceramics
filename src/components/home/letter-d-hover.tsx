"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  onActiveChange: (active: boolean) => void;
};

export function LetterDHover({ active, onActiveChange }: LetterDHoverProps) {
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

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      onMouseEnter={() => onActiveChange(true)}
      onMouseLeave={() => onActiveChange(false)}
    >
      <div className="relative inline-flex">
        <Link
          href="/collections/tableware"
          aria-label="Tableware"
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
          <div
            className="pointer-events-none absolute inset-0 z-20 max-md:hidden"
            style={{ fontSize: letterSize }}
            aria-hidden
          >
            {/* Text — right of D */}
            <div className="d-hover-text absolute top-1/2 left-[calc(100%+24px)] z-30 w-[max-content] max-w-[46vw]">
              <p className="font-[family-name:var(--font-playfair)] text-[56px] leading-[1.05] font-extrabold italic tracking-[-0.01em] whitespace-nowrap text-[#F8F5EE]">
                Darling Babies
              </p>
              <p className="mt-3 max-w-[400px] font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal whitespace-normal text-[#F8F5EE]/85">
                Polished, well-loved, thoughtful, and somehow survived my picky
                heart.
              </p>
            </div>

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
        )}
      </div>
    </div>
  );
}
