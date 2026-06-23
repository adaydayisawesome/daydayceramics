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
 *  - spin360:        SpinViewer plays a turntable on hover, else stays static
 *
 * Touch / no-hover devices never trigger hover media (we gate on `(hover: hover)
 * and (pointer: fine)`), so they always see the clean static image.
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

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const active = hovered && canHover;
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
        {/* Price — quiet centered text along the cell's bottom edge by default;
            on hover (in sync with the spin/crossfade media) it fills a solid
            neon-green circle with bold dark-ink text. */}
        <span
          className={`pointer-events-none absolute bottom-3 left-1/2 z-10 flex h-11 min-w-11 -translate-x-1/2 items-center justify-center rounded-full px-2.5 text-[12px] leading-none tracking-wide tabular-nums transition-all duration-300 ease-out group-hover:bg-[#03F94D] group-hover:font-bold group-hover:text-[#413E3F] ${
            product.isSold ? "font-medium text-neutral-400" : "font-medium text-neutral-600"
          }`}
        >
          {product.isSold ? "sold" : priceLabel(product.price)}
        </span>

        <ProductMedia product={product} active={active} grayscale={grayscale} />
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
