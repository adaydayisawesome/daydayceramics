export const CREAM = "#F8F5EE";
export const INK = "#413E3F";

/** Full-viewport color swap — 500–800ms is typical for large UI transitions */
export const HOVER_COLOR_MS = 700;
/** Pause after color swap begins before cup/text reveal */
export const HOVER_CONTENT_DELAY_MS = 200;

export const letterSize =
  "min(calc((100vh - 60px) / 1.074), calc((100vw - 280px) / 2.1))";

export const letterStyle = {
  fontSize: letterSize,
  transform: "scaleY(1.25)",
} as const;
