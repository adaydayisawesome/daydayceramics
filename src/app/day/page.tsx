import { DayScrollExperience } from "@/components/home/day-scroll-experience";

/**
 * `/day` renders V2 — the scroll-driven DAY → Y → About experience — directly.
 *
 * V1 (the legacy per-letter DAY home) and the V1/V2/V3 floating switcher are
 * intentionally NOT wired up here, but they are PRESERVED in the repo so they
 * can be brought back later:
 *   - `src/components/home/day-versions.tsx`  — the switcher + version host
 *   - `src/components/home/day-letters.tsx`   — V1 (+ letter-*-hover, about-interstitial)
 *   - `src/components/home/day-letters-v3.tsx` — V3 stub
 *
 * To restore the switcher (and V1/V3), just render <DayVersions /> here again.
 */
export default function DayPage() {
  return <DayScrollExperience />;
}
