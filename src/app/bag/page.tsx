"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * The shopping-bag / cart page (`/bag`) — a full-page interstitial on the cream
 * background. There is no cart state yet, so this always renders the empty
 * state.
 *
 * Header: a single circular "X" close button in the TOP-LEFT, mirroring the
 * circular button style + page padding used by the home grid header
 * (`home-shop.tsx`). Clicking it returns to the previous page via
 * `router.back()`.
 *
 * Empty state: a big, responsive line centered on the page, constrained to the
 * same column width as the About page, in the Figtree voice.
 */
export default function BagPage() {
  const router = useRouter();

  const circleButton =
    "group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#03F94D]";

  return (
    <main className="relative min-h-[100svh] bg-[#FAF5ED] font-[family-name:var(--font-figtree)] text-[#413E3F]">
      {/* TOP-LEFT — circular X close button, matching the home header padding. */}
      <header className="absolute top-0 left-0 z-20 p-6">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className={circleButton}
        >
          <X className="size-5 text-[#413E3F]" />
        </button>
      </header>

      {/* EMPTY STATE — centered, big, responsive line in the About column width. */}
      <div className="flex min-h-[100svh] items-center justify-center px-6">
        <p className="w-full max-w-[760px] text-[clamp(36px,7vw,72px)] leading-[1.05] font-bold text-[#413E3F]">
          You came all this way and picked nothing.
          <br />
          Damn.
        </p>
      </div>
    </main>
  );
}
