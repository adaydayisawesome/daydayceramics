"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CREAM, HOVER_COLOR_MS, INK, letterStyle } from "./constants";
import { LetterDHover } from "./letter-d-hover";

export function DayLetters() {
  const [dHovered, setDHovered] = useState(false);

  useEffect(() => {
    const bg = dHovered ? INK : CREAM;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [dHovered]);

  return (
    <main
      className="flex h-screen w-full snap-y snap-mandatory flex-col overflow-y-auto transition-colors ease-in-out md:snap-none md:flex-row md:items-center md:justify-center md:gap-[98px] md:overflow-hidden"
      style={{
        backgroundColor: dHovered ? INK : CREAM,
        transitionDuration: `${HOVER_COLOR_MS}ms`,
      }}
    >
      <h1 className="sr-only">Day Day Ceramics</h1>

      <div className="flex h-screen w-full shrink-0 snap-start items-center justify-center md:h-full md:w-auto md:flex-none">
        <LetterDHover active={dHovered} onActiveChange={setDHovered} />
      </div>

      <section className="flex h-screen w-full shrink-0 snap-start items-center justify-center md:h-full md:w-auto md:flex-none">
        <Link
          href="/collections/vases"
          aria-label="Vases"
          className="group inline-flex no-underline text-[#413E3F]"
        >
          <span
            aria-hidden
            className="block leading-none text-[#413E3F] select-none font-[family-name:var(--font-anton)]"
            style={letterStyle}
          >
            A
          </span>
        </Link>
      </section>

      <section className="flex h-screen w-full shrink-0 snap-start items-center justify-center md:h-full md:w-auto md:flex-none">
        <span className="group inline-flex">
          <span
            aria-hidden
            className="block leading-none text-[#413E3F] select-none font-[family-name:var(--font-anton)]"
            style={letterStyle}
          >
            Y
          </span>
        </span>
      </section>
    </main>
  );
}
