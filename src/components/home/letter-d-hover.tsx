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
          className="inline-flex no-underline transition-colors ease-in-out"
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
            className="pointer-events-none absolute inset-0 max-md:hidden"
            style={{ fontSize: letterSize }}
            aria-hidden
          >
            <div className="d-hover-text absolute top-1/2 left-[calc(100%+20px)] z-30 w-[min(52vw,360px)]">
              <p className="font-[family-name:var(--font-playfair)] text-[56px] leading-[1.05] font-extrabold italic tracking-[-0.01em] text-[#F8F5EE]">
                Darling Babies
              </p>
              <p className="mt-3 font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal text-[#F8F5EE]/85">
                Polished, well-loved, thoughtful, and somehow survived my picky
                heart.
              </p>
            </div>

            <div
              className="d-hover-fade absolute top-[31%] left-[0.01em] h-[14%] w-[0.11em]"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)",
              }}
            />
            <div
              className="d-hover-fade absolute top-[55%] left-[0.01em] h-[14%] w-[0.11em]"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
              }}
            />

            <div className="absolute top-[32%] left-0 h-[0.36em] w-[0.16em] overflow-hidden">
              <div className="d-hover-cup h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/tea-cup-source.png"
                  alt=""
                  className="block h-[0.36em] w-auto max-w-none mix-blend-lighten"
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
