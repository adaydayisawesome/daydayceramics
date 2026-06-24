import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { DayMark } from "../day-mark";
import { INK } from "./constants";

/**
 * Header for the DAY scroll experience. The brand (DAY mark + "Day Day
 * Ceramics") links back to the combined product home (`/`). The top-right slot
 * holds the same shopping-bag circular button (with a count badge) used in the
 * home header. The Shipping policy now lives in the in-flow About/Shipping
 * section below, so the old header link is gone.
 */
export function DayPageHeader() {
  const circleButton =
    "group pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#03F94D]";

  return (
    <header
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between p-6"
      style={{ color: INK }}
    >
      <Link
        href="/"
        aria-label="Day Day Ceramics — home"
        className="pointer-events-auto inline-flex items-center gap-2 no-underline transition-opacity hover:opacity-70"
        style={{ color: INK }}
      >
        <DayMark />
        <span className="font-[family-name:var(--font-figtree)] text-[14px] font-semibold tracking-[-0.01em] uppercase">
          Day Day Ceramics
        </span>
      </Link>

      {/* Cart bag (→ /bag) with a (placeholder) count badge — mirrors home. */}
      <div className="relative">
        <Link href="/bag" aria-label="Cart, 0 items" className={circleButton}>
          <ShoppingBag className="size-5 text-[#413E3F] transition-colors" />
        </Link>
        <span className="pointer-events-none absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#03F94D] px-1 text-[10px] font-bold text-[#413E3F] ring-2 ring-[#F8F5EE] tabular-nums">
          0
        </span>
      </div>
    </header>
  );
}
