"use client";

import { useState } from "react";

import type { Product, ProductCellData } from "@/lib/products";
import { ProductCell } from "./product-cell";
import { ProductModal } from "./product-modal";

/**
 * Gallery-style product grid — full-bleed.
 *
 * Layout is driven entirely by component-scoped CSS (the <style> below) so the
 * change stays isolated from globals.css. The grid fills its container edge to
 * edge (no left/right margins). Rows are FIXED height (`grid-auto-rows`) so each
 * cell keeps the same proportion regardless of item count: the first screen
 * (2 rows desktop / 3 rows portrait) fills the viewport exactly as before, and
 * any additional rows continue below — the PAGE scrolls vertically. Cell aspect
 * ratio is free — the piece is `object-contain` so it's never cropped/distorted.
 *
 * Breakpoints:
 *  - >= 960px, or < 960px in landscape (enough horizontal room): 3 columns
 *  - < 960px in portrait (tablet/mobile): 2 columns
 *
 * Row height is `(100svh - header - gaps) / firstScreenRows` so the first screen
 * is pixel-identical to the old non-scrolling grid (`--ddc-header-h` matches the
 * page header: p-6 = 24px top+bottom around a 40px button = 88px).
 *
 * Visual style: no borders, shadows, dividers or card chrome — the cells blend
 * into one continuous white plane.
 *
 * This is the minimal CLIENT boundary that holds the "open product" state: a
 * clicked cell opens a `ProductModal` (the detail route was removed) instead of
 * navigating. Sold cells don't open the modal. It's shared by both the combined
 * home grid and the per-collection pages, which just pass different `cells`.
 */
export function ProductGrid({ cells }: { cells: ProductCellData[] }) {
  const [open, setOpen] = useState<ProductCellData | null>(null);

  return (
    <>
      <style>{gridCss}</style>
      <ul className="ddc-grid">
        {cells.map((cell) => (
          <ProductCell
            key={`${cell.collectionSlug}/${cell.product.id}`}
            product={cell.product}
            collectionSlug={cell.collectionSlug}
            onOpen={(product: Product) =>
              setOpen({ product, collectionSlug: cell.collectionSlug })
            }
          />
        ))}
      </ul>
      <ProductModal
        product={open?.product ?? null}
        collectionSlug={open?.collectionSlug ?? null}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

const gridCss = `
.ddc-grid {
  /* Page header height (p-6 = 24px top+bottom around a 40px button). */
  --ddc-header-h: 88px;
  --ddc-gap: 8px;
  display: grid;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--ddc-gap);
  width: 100%;
}

.ddc-cell {
  position: relative;
  min-width: 0;
  min-height: 0;
  background: transparent;
}

/* Portrait (tablet/mobile): 2 columns. Rows are fixed so the FIRST 3 fill the
   viewport (2 inter-row gaps subtracted); more rows continue below and scroll. */
@media (max-width: 959.98px) and (orientation: portrait) {
  .ddc-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: calc(
      (100svh - var(--ddc-header-h) - (2 * var(--ddc-gap))) / 3
    );
  }
}

/* Wide (>=960px) or landscape: 3 columns. Rows are fixed so the FIRST 2 fill the
   viewport (1 inter-row gap subtracted); more rows continue below and scroll. */
@media (min-width: 960px), (max-width: 959.98px) and (orientation: landscape) {
  .ddc-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-auto-rows: calc(
      (100svh - var(--ddc-header-h) - (1 * var(--ddc-gap))) / 2
    );
  }
}
`;
