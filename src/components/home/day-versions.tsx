"use client";

import { useEffect, useState } from "react";

import { DayLetters } from "./day-letters";
import { DayLettersV3 } from "./day-letters-v3";
import { DayScrollExperience } from "./day-scroll-experience";

type Version = 1 | 2 | 3;

const VERSIONS: Version[] = [1, 2, 3];

/** `/day` defaults to V2 — the new scroll-driven DAY→Y experience. */
function parseVersion(value: string | null): Version {
  const n = Number(value);
  return n === 1 || n === 3 ? n : 2;
}

/**
 * Hosts the DAY experience at `/day` and keeps the (intentionally off-brand)
 * V1/V2/V3 floating switcher so the OLD home DAY variants stay previewable:
 *   - V1 — the legacy per-letter DAY home (`DayLetters`), unchanged.
 *   - V2 — the NEW scroll-driven DAY→Y→About experience (default).
 *   - V3 — placeholder stub.
 *
 * The selection is mirrored to the URL as `?v=1|2|3` via `history.replaceState`
 * (no navigation / no Suspense), initialized from `window.location` after mount.
 */
export function DayVersions() {
  const [version, setVersion] = useState<Version>(2);

  useEffect(() => {
    const initial = parseVersion(
      new URLSearchParams(window.location.search).get("v")
    );
    setVersion(initial);
  }, []);

  const selectVersion = (next: Version) => {
    setVersion(next);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(next));
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      {version === 1 && <DayLetters />}
      {version === 2 && <DayScrollExperience />}
      {version === 3 && <DayLettersV3 />}

      <VersionSwitcher active={version} onSelect={selectVersion} />
    </>
  );
}

/**
 * Intentionally OFF-BRAND dev/utility toggle: a small fixed dark pill of
 * monospace buttons, bottom-right, above everything else (z-[200]). It looks
 * nothing like the serif/cream site so it reads as a tool, not site chrome.
 */
function VersionSwitcher({
  active,
  onSelect,
}: {
  active: Version;
  onSelect: (v: Version) => void;
}) {
  return (
    <div className="pointer-events-auto fixed right-3 bottom-3 z-[200] flex items-center gap-1 rounded-full bg-neutral-900/95 p-1 font-mono text-xs text-neutral-300 shadow-lg ring-1 ring-white/10 backdrop-blur">
      {VERSIONS.map((v) => {
        const isActive = v === active;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            aria-pressed={isActive}
            className={`cursor-pointer rounded-full px-2.5 py-1 leading-none transition-colors ${
              isActive
                ? "bg-lime-400 font-semibold text-neutral-900"
                : "text-neutral-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            V{v}
          </button>
        );
      })}
    </div>
  );
}
