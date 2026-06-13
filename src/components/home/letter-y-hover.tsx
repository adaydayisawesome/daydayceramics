"use client";

import { useEffect, useState } from "react";

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
  onActiveChange: (active: boolean) => void;
  onOpen: () => void;
};

export function LetterYHover({
  active,
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

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      onMouseEnter={() => onActiveChange(true)}
      onMouseLeave={() => onActiveChange(false)}
    >
      <div className="relative inline-flex">
        <button
          type="button"
          aria-label="About"
          onClick={onOpen}
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
          <div
            className="pointer-events-none absolute inset-0 z-20 max-md:hidden"
            style={{ fontSize: letterSize }}
            aria-hidden
          >
            {/* Text — left of Y, slides in from the right (right → left) */}
            <div className="y-hover-text absolute top-1/2 right-[calc(100%+28px)] z-30 w-[max-content] max-w-[46vw] text-right">
              <p className="font-[family-name:var(--font-playfair)] text-[56px] leading-[1.05] font-extrabold italic tracking-[-0.01em] whitespace-nowrap text-[#F8F5EE]">
                Why Babies?
              </p>
              <p className="mt-3 ml-auto max-w-[420px] font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal whitespace-normal text-[#F8F5EE]/85">
                Every piece here is handmade by me, one at a time, as part of my
                ongoing exploration in functional ceramics: objects meant to be
                used, held, lived with, and hopefully loved.
              </p>
              <p className="mt-6 font-[family-name:var(--font-figtree)] text-[18px] leading-[1.45] font-normal text-[#F8F5EE]/85">
                Click on Y to learn more.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
