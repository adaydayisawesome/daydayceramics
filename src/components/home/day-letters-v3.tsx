"use client";

import { useEffect } from "react";

import { CREAM, INK } from "./constants";
import { HomeFooter } from "./home-footer";

/**
 * V3 home — placeholder stub so the version switcher's third button works.
 *
 * TODO: build the real V3 home page. For now this just renders a centered,
 * deliberately off-brand "coming soon" marker on the cream background with the
 * footer visible.
 */
export function DayLettersV3() {
  useEffect(() => {
    document.documentElement.style.backgroundColor = CREAM;
    document.body.style.backgroundColor = CREAM;
  }, []);

  return (
    <main
      className="flex h-[100svh] w-full items-center justify-center overflow-hidden"
      style={{ backgroundColor: CREAM }}
    >
      <h1 className="sr-only">Day Day Ceramics</h1>

      <p
        className="font-mono text-sm tracking-widest uppercase opacity-60"
        style={{ color: INK }}
      >
        V3 — coming soon
      </p>

      <HomeFooter active={false} />
    </main>
  );
}
