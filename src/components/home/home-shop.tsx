import Link from "next/link";
import { ShoppingBag, Smile } from "lucide-react";

import { ProductGrid } from "@/components/collections/product-grid";
import { DayMark } from "@/components/day-mark";
import { allProductCells } from "@/lib/products";

/**
 * The site's MAIN home (`/`): one combined, full-bleed grid of EVERY product
 * across all collections (darling-babies + ugly-babies together), reusing the
 * collection `ProductGrid`/`ProductCell` (incl. the neon-green price hover
 * badge). Cells still link to their own `/collections/<collection>/<product>`
 * detail routes — the underlying collection data/routes are untouched.
 *
 * Header (88px, mirrors the collection header so the grid row math lines up):
 *   - LEFT  : smiley circular button → the DAY scroll experience (`/day`)
 *   - CENTER: the DAY logo mark (branding)
 *   - RIGHT : a shopping-bag circular button with a count badge (cart isn't
 *             wired yet, so the count is a real—but static—`0` badge).
 */
export function HomeShop() {
  const cells = allProductCells();

  const circleButton =
    "group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#03F94D]";

  return (
    <main className="flex min-h-[100svh] flex-col bg-[#FAF5ED] font-[family-name:var(--font-figtree)] text-neutral-900">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[#FAF5ED] p-6">
        {/* LEFT — smiley enters the DAY experience. */}
        <Link href="/day" aria-label="Enter the DAY experience" className={circleButton}>
          <Smile className="size-5 text-[#413E3F] transition-colors" />
        </Link>

        {/* CENTER — DAY logo mark (same mark as the footer / collection header). */}
        <DayMark
          width={56}
          height={28}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#413E3F]"
        />

        {/* RIGHT — cart bag with a (placeholder) count badge. */}
        <div className="relative">
          <button type="button" aria-label="Cart, 0 items" className={circleButton}>
            <ShoppingBag className="size-5 text-[#413E3F] transition-colors" />
          </button>
          <span className="pointer-events-none absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#03F94D] px-1 text-[10px] font-bold text-[#413E3F] ring-2 ring-[#FAF5ED] tabular-nums">
            0
          </span>
        </div>
      </header>

      <div className="flex-1">
        <ProductGrid cells={cells} />
      </div>
    </main>
  );
}
