export const CREAM = "#F8F5EE";
export const INK = "#413E3F";

/** Full-viewport color swap — 500–800ms is typical for large UI transitions */
export const HOVER_COLOR_MS = 700;
/** Pause after color swap begins before cup/text reveal */
export const HOVER_CONTENT_DELAY_MS = 200;

/**
 * Letter font size. Resolved from a CSS custom property so the value can be
 * swapped per breakpoint (see globals.css):
 *   desktop : sized to the viewport height, leaving room for the side reveal
 *   mobile  : sized to fit all three letters comfortably on one row
 * Both the glyphs and the em-based reveal (cup/gradient) read this same value,
 * so the cup keeps emerging from the counter correctly at any size.
 */
export const letterSize = "var(--letter-size)";

export const letterStyle = {
  fontSize: letterSize,
  transform: "scaleY(1.25)",
} as const;

/**
 * Cup slide-out duration. MUST match the `.d-hover-cup` animation in
 * globals.css (`animation: cup-slide 0.7s ...`). The 360° spinner drives its
 * frame index over this same window so the rotation finishes exactly when the
 * cup finishes sliding out.
 */
export const SLIDE_MS = 700;

/**
 * Per-letter spin tuning for the shared "cup-a" turntable asset. Both letters
 * reuse the SAME sprite/manifest but can rest on a different "front" frame and
 * spin a different number of times as they slide out.
 *   - rotations : how many full turns to play during the slide-out.
 *   - settleFrame: which frame to land on (overrides manifest.settleFrame).
 *       Tip: with the cup-a asset there are 24 frames over one physical turn,
 *       so settleFrame steps in ~15° increments. Tune to taste.
 */
export const SPIN_ASSET = "cup-a";
/** D has its own turntable object (same baked halftone "print" treatment as A). */
export const D_SPIN_ASSET = "cup-d";
export const SPIN_FALLBACK = "/images/tea-cup.png";

export const A_SPIN = {
  rotations: 1,
  settleFrame: 0,
} as const;

export const D_SPIN = {
  rotations: 1,
  settleFrame: 0,
} as const;
