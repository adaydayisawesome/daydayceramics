import Link from "next/link";

import { CREAM, HOVER_COLOR_MS, INK } from "./constants";

type HomeFooterProps = {
  /** True while a D/A/Y letter is hovered (page background flips to INK). */
  active: boolean;
  /**
   * Optional: when provided, the "Day Day Ceramics" brand becomes a clickable
   * button that calls this (V2 uses it to open the About interstitial). When
   * omitted (V1), the brand stays a plain, non-interactive span — unchanged.
   */
  onBrandClick?: () => void;
};

export function HomeFooter({ active, onBrandClick }: HomeFooterProps) {
  // Flip the footer text to CREAM while a letter is hovered so it stays
  // readable on the INK page background. The DAY badge below is intentionally
  // left constant (it reads correctly on both backgrounds).
  const textColor = active ? CREAM : INK;

  const brandClass =
    "font-[family-name:var(--font-figtree)] text-[14px] font-semibold tracking-[-0.01em] uppercase";

  return (
    <footer
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-center justify-between transition-colors ease-in-out"
      style={{
        color: textColor,
        transitionDuration: `${HOVER_COLOR_MS}ms`,
      }}
    >
      {/* LEFT group — 16px left/bottom inset (8px on ≤640px). */}
      <div className="flex items-center gap-2 pb-4 pl-4 max-sm:pb-2 max-sm:pl-2">
        <DayMark />
        {onBrandClick ? (
          <button
            type="button"
            onClick={onBrandClick}
            className={`${brandClass} pointer-events-auto cursor-pointer bg-transparent p-0 text-inherit transition-opacity hover:opacity-70`}
          >
            Day Day Ceramics
          </button>
        ) : (
          <span className={brandClass}>Day Day Ceramics</span>
        )}
      </div>

      {/* RIGHT group — 16px right/bottom inset (8px on ≤640px). */}
      <div className="pb-4 pr-4 max-sm:pb-2 max-sm:pr-2">
        {/* TODO: destination for Shipping & Policies is unknown — placeholder. */}
        <Link
          href="#"
          className="pointer-events-auto inline-flex cursor-pointer font-[family-name:var(--font-figtree)] text-[14px] font-normal tracking-[-0.01em] uppercase no-underline transition-opacity hover:opacity-70"
        >
          Shipping &amp; Policies
        </Link>
      </div>
    </footer>
  );
}

/**
 * DAY monogram mark (32×16). Rendered as a CSS mask filled with `currentColor`
 * so it inherits the footer's INK→CREAM flip (the ink artwork would otherwise
 * disappear on the hovered ink background). Source art: /images/day-logo.png.
 */
function DayMark() {
  return (
    <span
      role="img"
      aria-label="DAY"
      className="block shrink-0"
      style={{
        width: 32,
        height: 16,
        backgroundColor: "currentColor",
        WebkitMaskImage: "url(/images/day-logo.png)",
        maskImage: "url(/images/day-logo.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
