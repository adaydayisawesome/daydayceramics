"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Typography mirrors About's shared classes (kept in sync with
// `about-content.tsx`): titles = Figtree 20px bold, body = Figtree 18px / 1.4.
const subheadingClass =
  "font-[family-name:var(--font-figtree)] text-[20px] leading-none font-bold";
const bodyClass =
  "font-[family-name:var(--font-figtree)] text-[18px] leading-[1.4] font-normal";

/**
 * A single collapsible Shipping & Returns subsection, collapsed by default.
 *
 * The header is a real <button> (full-width click target) carrying
 * `aria-expanded` and pointing at the body via `aria-controls`. Toggling
 * `open` swaps the body in/out and rotates the ink-tinted chevron. Used inside
 * the otherwise-static About content for the "Shipping Damage", "Shipping", and
 * "Local Pickup & Delivery" sections.
 */
export function ShippingCollapsible({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = `${id}-body`;

  return (
    <div className="border-t border-[#413E3F]/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-[#413E3F]"
      >
        <span className={subheadingClass}>{title}</span>
        <ChevronDown
          aria-hidden
          className={`size-5 shrink-0 text-[#413E3F] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div id={bodyId} className={`${bodyClass} pb-5 text-[#413E3F]`}>
          {children}
        </div>
      )}
    </div>
  );
}
