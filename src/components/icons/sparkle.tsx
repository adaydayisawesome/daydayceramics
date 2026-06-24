/**
 * A hand-drawn-ish 4-point sparkle (filled, no stroke).
 *
 * Shared shape used by both the DAY scroll experience (sparkles bursting from
 * the kiln) and the ugly-babies questionnaire (decorative scattered stars), so
 * the star motif stays identical across the site. Purely decorative — always
 * `aria-hidden`.
 */
export function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
    >
      <path
        d="M50 1 C54 37 56 44 99 50 C56 56 54 63 50 99 C46 63 44 56 1 50 C44 44 46 37 50 1 Z"
        fill={color}
      />
    </svg>
  );
}
