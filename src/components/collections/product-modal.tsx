"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import type { Product } from "@/lib/products";
import { getCollection, priceLabel } from "@/lib/products";
import { DetailMedia } from "./detail-media";

/**
 * Product INTERSTITIAL — the state-driven replacement for the old
 * `/collections/[collection]/[product]` detail route (now removed).
 *
 * It renders the SAME content the detail page showed — the matted hero / 360°
 * spin (via `DetailMedia`), the full `detailImages` gallery, any `detailVideos`,
 * and the title + price — but as a modal layered over the grid instead of a
 * route. The parent grid owns the "which product is open" state and passes the
 * cell down here; `null` renders nothing.
 *
 * Closes on the X button, a backdrop click, or Escape. Body scroll is locked
 * while open. Visual language matches the site: cream `#FAF5ED`, ink `#413E3F`,
 * a circular `X` button like the rest of the headers, and neon-green accents.
 */
export function ProductModal({
  product,
  collectionSlug,
  onClose,
}: {
  product: Product | null;
  collectionSlug: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  if (!product || !collectionSlug) return null;

  const isUgly = collectionSlug === "ugly-babies";
  const collectionTitle = getCollection(collectionSlug)?.title ?? "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-figtree)]"
    >
      {/* Backdrop — ink wash; clicking it closes the modal. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[#413E3F]/45 backdrop-blur-[2px]"
      />

      {/* Panel — cream plane. Clicks inside don't bubble to the backdrop. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-[#FAF5ED] text-[#413E3F] shadow-2xl"
      >
        {/* Circular X — TOP-LEFT, matching the site's left-aligned close/X
            convention (home grid header, /bag, etc.). */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 left-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-[#FAF5ED]/80 transition-colors hover:bg-[#03F94D]"
        >
          <X className="size-5 text-[#413E3F]" />
        </button>

        <div className="overflow-y-auto p-6 md:p-10">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
            <DetailMedia
              title={product.title}
              defaultImage={product.defaultImage}
              detailImages={product.detailImages}
              detailVideos={product.detailVideos}
              spinMedia={product.spinMedia}
              hoverType={product.hoverType}
              isSold={product.isSold}
            />

            <div className="flex w-full flex-col items-start text-left md:flex-1 md:pt-4">
              <p className="text-sm tracking-[0.02em] text-neutral-500">
                {collectionTitle}
              </p>
              <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold">
                {product.title}
              </h2>

              {/* Price / status — mirrors the grid cell treatment:
                  · sold pieces: "Sold" with a neon-green strike
                  · ugly babies: an "Adopt this baby" pill (no price)
                  · everything else: the price */}
              <div className="mt-4">
                {product.isSold ? (
                  <span className="text-lg font-semibold text-[#413E3F] line-through decoration-[#03F94D] decoration-[3px]">
                    Sold
                  </span>
                ) : isUgly ? (
                  <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center rounded-full border border-[#413E3F] bg-transparent px-4 text-[13px] font-semibold tracking-wide text-[#413E3F] transition-colors hover:bg-[#03F94D]"
                  >
                    Adopt this baby
                  </button>
                ) : (
                  <span className="text-lg text-neutral-700">
                    {priceLabel(product.price)}
                  </span>
                )}
              </div>

              <p className="mt-8 max-w-sm text-sm leading-relaxed text-neutral-500">
                Checkout will connect to Shopify here later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
