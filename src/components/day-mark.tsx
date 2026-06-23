/**
 * DAY monogram mark. Rendered as a CSS mask filled with `currentColor` so it
 * inherits the surrounding text color (e.g. the footer's INK→CREAM flip, or the
 * collection header's ink). Source art: /images/day-logo.png (≈2:1).
 *
 * Shared by the home footer and the collection page header so the logo mark
 * stays identical across the site.
 */
export function DayMark({
  width = 32,
  height = 16,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="DAY"
      className={`block shrink-0 ${className}`}
      style={{
        width,
        height,
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
