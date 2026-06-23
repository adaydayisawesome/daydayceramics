"use client";

import { useEffect, useState } from "react";

import { DayLetters } from "./day-letters";
import { DayLettersV2 } from "./day-letters-v2";
import { DayLettersV3 } from "./day-letters-v3";

type Version = 1 | 2 | 3;

const VERSIONS: Version[] = [1, 2, 3];

function parseVersion(value: string | null): Version {
  const n = Number(value);
  return n === 2 || n === 3 ? n : 1;
}

/**
 * Client wrapper that holds the active home-page version and renders the
 * matching variant plus a floating dev-style version switcher.
 *
 * The selection is mirrored to the URL as `?v=1|2|3` via `history.replaceState`
 * (no navigation / no Suspense boundary), and initialized from `window.location`
 * after mount. We deliberately avoid `useSearchParams` so this stays a simple
 * client toggle without forcing a Suspense wrapper.
 */
export function HomeVersions() {
  const [version, setVersion] = useState<Version>(1);

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
      {version === 2 && <DayLettersV2 />}
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
