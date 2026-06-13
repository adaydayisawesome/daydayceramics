"use client";

import { useEffect, useState } from "react";

import { AboutInterstitial } from "./about-interstitial";
import { CREAM, HOVER_COLOR_MS, INK } from "./constants";
import { HomeFooter } from "./home-footer";
import { LetterAHover } from "./letter-a-hover";
import { LetterDHover } from "./letter-d-hover";
import { LetterYHover } from "./letter-y-hover";

type ActiveLetter = "d" | "a" | "y" | null;

/**
 * True on touch / no-hover devices. Used to switch the letters from a
 * hover-driven reveal (desktop) to a tap-to-focus / tap-away-to-dismiss
 * interaction (mobile). Starts `false` so the server render matches a desktop
 * client; it flips after hydration on coarse-pointer devices.
 */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return coarse;
}

export function DayLetters() {
  const [active, setActive] = useState<ActiveLetter>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const coarse = useCoarsePointer();
  const hovered = active !== null;

  useEffect(() => {
    const bg = hovered ? INK : CREAM;
    document.documentElement.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
  }, [hovered]);

  const setLetter = (letter: Exclude<ActiveLetter, null>) => (on: boolean) =>
    setActive((prev) => (on ? letter : prev === letter ? null : prev));

  // On touch devices, tapping the empty background dismisses the focused
  // letter. Letter glyphs stop propagation, so only "tap away" reaches here.
  const handleBackgroundClick = () => {
    if (coarse) setActive(null);
  };

  return (
    <main
      onClick={handleBackgroundClick}
      className="flex h-screen w-full flex-row items-center justify-center gap-[6vw] overflow-hidden transition-colors ease-in-out md:gap-[98px]"
      style={{
        backgroundColor: hovered ? INK : CREAM,
        transitionDuration: `${HOVER_COLOR_MS}ms`,
      }}
    >
      <h1 className="sr-only">Day Day Ceramics</h1>

      <div className="flex h-full w-auto flex-none items-center justify-center">
        <LetterDHover
          active={active === "d"}
          coarse={coarse}
          onActiveChange={setLetter("d")}
        />
      </div>

      <div className="flex h-full w-auto flex-none items-center justify-center">
        <LetterAHover
          active={active === "a"}
          coarse={coarse}
          onActiveChange={setLetter("a")}
        />
      </div>

      <div className="flex h-full w-auto flex-none items-center justify-center">
        <LetterYHover
          active={active === "y"}
          coarse={coarse}
          onActiveChange={setLetter("y")}
          onOpen={() => setAboutOpen(true)}
        />
      </div>

      <HomeFooter active={hovered} />

      <AboutInterstitial open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
