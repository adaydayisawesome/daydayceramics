"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";
import { priceLabel } from "@/lib/products";
import { SpinViewer } from "./spin-viewer";

/**
 * A single square product cell.
 *
 * No card chrome: the cell is a transparent square that blends into the page's
 * white plane. Media is `object-contain` and centered so pieces are never
 * cropped or distorted, and absolutely positioned so hover never shifts layout.
 * Hover behavior is dispatched by `product.hoverType`:
 *  - staticOnly:     no change
 *  - alternateAngle: CSS opacity crossfade default -> alternate
 *  - spin360:        SpinViewer plays a turntable on hover (desktop) or
 *                    auto-plays continuously by default (mobile / no-hover)
 *
 * Hover-capable desktops (gated on `(hover: hover) and (pointer: fine)`) only
 * spin/crossfade on hover. On touch / no-hover devices there is no hover, so
 * `spin360` pieces auto-spin by default instead — every cell turns on its own.
 * Detection is robust: a coarse-pointer / no-hover media query OR a narrow
 * (<=767px) viewport counts as mobile. SSR-safe: both flags start `false`
 * (clean static image) and flip only after mount, so server output never
 * mismatches the client.
 */
export function ProductCell({
  product,
  collectionSlug,
  onOpen,
}: {
  product: Product;
  collectionSlug: string;
  onOpen: (product: Product) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const hoverMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    // Mobile = no hover OR coarse pointer OR a narrow viewport. Any one is
    // enough to treat the device as touch-first and auto-spin by default.
    const mobileMq = window.matchMedia(
      "(hover: none), (pointer: coarse), (max-width: 767px)"
    );
    const update = () => {
      setCanHover(hoverMq.matches);
      setIsMobile(mobileMq.matches);
    };
    update();
    hoverMq.addEventListener("change", update);
    mobileMq.addEventListener("change", update);
    return () => {
      hoverMq.removeEventListener("change", update);
      mobileMq.removeEventListener("change", update);
    };
  }, []);

  // Desktop spins on hover; mobile auto-spins all cells (no hover to rely on).
  const active = (hovered && canHover) || isMobile;
  const grayscale = product.isSold;
  // Every piece now shows the "Adopt" pill instead of a price (sold pieces
  // still render "Sold" — handled first in CellLabel). collectionSlug is
  // surfaced as a data attribute for future per-collection styling/logic.
  const isAdopt = true;

  // Hover handlers are shared by the clickable and sold variants so SOLD pieces
  // still spin (and auto-spin on mobile) even though they don't open the modal.
  const hoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  const inner = (
    <>
      {/* Media gets its own area. On mobile we reserve a fixed strip at the
          bottom (`bottom-12`) for the always-visible label so it never sits on
          top of the piece; on desktop the media fills the cell and the label
          floats over its bottom edge. */}
      <div className="absolute inset-x-0 top-0 bottom-12 md:bottom-0">
        <ProductMedia product={product} active={active} grayscale={grayscale} />
      </div>
      <CellLabel product={product} isAdopt={isAdopt} />
    </>
  );

  // SOLD pieces are NOT clickable (no modal, default cursor) but still hover /
  // auto-spin, so they render as a plain div rather than a button.
  return (
    <li className="ddc-cell" data-collection={collectionSlug}>
      {product.isSold ? (
        <div
          className="group relative block h-full w-full cursor-default"
          {...hoverHandlers}
        >
          {inner}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(product)}
          aria-label={`${product.title} — ${isAdopt ? "adopt this baby" : priceLabel(product.price)}`}
          className="group relative block h-full w-full cursor-pointer text-left outline-none"
          {...hoverHandlers}
        >
          {inner}
        </button>
      )}
    </li>
  );
}

/**
 * The bottom label for a cell. Same placement/visibility contract for all three
 * states — a reserved bottom strip on mobile (always visible), floating over
 * the piece's bottom on desktop:
 *   · sold:  the word "Sold" with a neon-green strike across it (always shown).
 *   · adopt (ugly babies): an "Adopt this baby" pill styled like the VIEW
 *     GALLERY pill — always shown on mobile, appears on hover on desktop.
 *   · priced: quiet centered price that fills a neon-green circle on hover.
 * It is `pointer-events-none` so the whole cell remains the click target.
 */
function CellLabel({
  product,
  isAdopt,
}: {
  product: Product;
  isAdopt: boolean;
}) {
  if (product.isSold) {
    return (
      <span className="pointer-events-none absolute bottom-0 left-1/2 z-10 flex h-12 -translate-x-1/2 items-center justify-center text-[13px] leading-none font-semibold tracking-wide text-[#413E3F] md:bottom-3 md:h-11">
        <span className="line-through decoration-[#03F94D] decoration-[3px]">
          Sold
        </span>
      </span>
    );
  }

  if (isAdopt) {
    // ALWAYS visible (mobile + desktop) — a clean, centered single-word pill.
    return (
      <span className="pointer-events-none absolute bottom-0 left-1/2 z-10 flex h-12 -translate-x-1/2 items-center justify-center md:bottom-3 md:h-11">
        <span className="inline-flex h-7 items-center justify-center rounded-full border border-[#413E3F] bg-transparent px-4 font-[family-name:var(--font-figtree)] text-[12px] leading-none font-semibold tracking-wide whitespace-nowrap text-[#413E3F] transition-colors group-hover:bg-[#03F94D]">
          Adopt
        </span>
      </span>
    );
  }

  return (
    <span className="pointer-events-none absolute bottom-0 left-1/2 z-10 flex h-12 min-w-11 -translate-x-1/2 items-center justify-center rounded-full px-2.5 text-[12px] leading-none font-medium tracking-wide text-neutral-600 tabular-nums transition-all duration-300 ease-out group-hover:bg-[#03F94D] group-hover:font-bold group-hover:text-[#413E3F] md:bottom-3 md:h-11">
      {priceLabel(product.price)}
    </span>
  );
}

function ProductMedia({
  product,
  active,
  grayscale,
}: {
  product: Product;
  active: boolean;
  grayscale: boolean;
}) {
  const grayscaleClass = grayscale ? "grayscale" : "";

  if (product.hoverType === "spin360" && product.spinMedia) {
    return (
      <SpinViewer
        spinMedia={product.spinMedia}
        fallbackImage={product.defaultImage}
        alt={product.title}
        active={active}
        grayscale={grayscale}
      />
    );
  }

  if (product.hoverType === "alternateAngle" && product.alternateImage) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.defaultImage}
          alt={product.title}
          draggable={false}
          className={`absolute inset-0 h-full w-full object-contain p-[10%] opacity-100 transition-opacity duration-500 ease-out group-hover:opacity-0 ${grayscaleClass}`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.alternateImage}
          alt=""
          aria-hidden
          draggable={false}
          className={`absolute inset-0 h-full w-full object-contain p-[10%] opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 ${grayscaleClass}`}
        />
      </>
    );
  }

  // staticOnly (and any product missing its hover asset) -> static image.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.defaultImage}
      alt={product.title}
      draggable={false}
      className={`absolute inset-0 h-full w-full object-contain p-[10%] ${grayscaleClass}`}
    />
  );
}
