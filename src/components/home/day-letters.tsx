"use client";

import { useEffect, useState } from "react";

import { AboutInterstitial } from "./about-interstitial";
import { CREAM, HOVER_COLOR_MS, INK } from "./constants";
import { LetterAHover } from "./letter-a-hover";
import { LetterDHover } from "./letter-d-hover";
import { LetterYHover } from "./letter-y-hover";

type ActiveLetter = "d" | "a" | "y" | null;

export function DayLetters() {
  const [active, setActive] = useState<ActiveLetter>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const hovered = active !== null;

  useEffect(() => {
    const bg = hovered ? INK : CREAM;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [hovered]);

  const setLetter = (letter: Exclude<ActiveLetter, null>) => (on: boolean) =>
    setActive((prev) => (on ? letter : prev === letter ? null : prev));

  return (
    <main
      className="flex h-screen w-full snap-y snap-mandatory flex-col overflow-y-auto transition-colors ease-in-out md:snap-none md:flex-row md:items-center md:justify-center md:gap-[98px] md:overflow-hidden"
      style={{
        backgroundColor: hovered ? INK : CREAM,
        transitionDuration: `${HOVER_COLOR_MS}ms`,
      }}
    >
      <h1 className="sr-only">Day Day Ceramics</h1>

      <div className="flex h-screen w-full shrink-0 snap-start items-center justify-center md:h-full md:w-auto md:flex-none">
        <LetterDHover active={active === "d"} onActiveChange={setLetter("d")} />
      </div>

      <div className="flex h-screen w-full shrink-0 snap-start items-center justify-center md:h-full md:w-auto md:flex-none">
        <LetterAHover active={active === "a"} onActiveChange={setLetter("a")} />
      </div>

      <div className="flex h-screen w-full shrink-0 snap-start items-center justify-center md:h-full md:w-auto md:flex-none">
        <LetterYHover
          active={active === "y"}
          onActiveChange={setLetter("y")}
          onOpen={() => setAboutOpen(true)}
        />
      </div>

      <AboutInterstitial open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
