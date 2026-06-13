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
