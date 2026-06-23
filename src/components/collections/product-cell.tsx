"use client";

import Link from "next/link";
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
}: {
  product: Product;
  collectionSlug: string;
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

  return (
    <li className="ddc-cell">
      <Link
        href={`/collections/${collectionSlug}/${product.slug}`}
        aria-label={`${product.title} — ${product.isSold ? "sold" : priceLabel(product.price)}`}
        className="group relative block h-full w-full outline-none"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {/* Media gets its own area. On mobile we reserve a fixed strip at the
            bottom (`bottom-12`) for the always-visible price so the label never
            sits on top of the piece; on desktop the media fills the cell and
            the price floats as a hover badge over it. */}
        <div className="absolute inset-x-0 top-0 bottom-12 md:bottom-0">
          <ProductMedia product={product} active={active} grayscale={grayscale} />
        </div>

        {/* Price — on mobile it rests in the reserved bottom strip, clearly
            separated below the piece. On desktop it's quiet centered text along
            the cell's bottom edge that, on hover (in sync with the spin /
            crossfade media), fills a solid neon-green circle with bold ink. */}
        <span
          className={`pointer-events-none absolute bottom-0 left-1/2 z-10 flex h-12 min-w-11 -translate-x-1/2 items-center justify-center rounded-full px-2.5 text-[12px] leading-none tracking-wide tabular-nums transition-all duration-300 ease-out md:bottom-3 md:h-11 group-hover:bg-[#03F94D] group-hover:font-bold group-hover:text-[#413E3F] ${
            product.isSold ? "font-medium text-neutral-400" : "font-medium text-neutral-600"
          }`}
        >
          {product.isSold ? "sold" : priceLabel(product.price)}
        </span>
      </Link>
    </li>
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
