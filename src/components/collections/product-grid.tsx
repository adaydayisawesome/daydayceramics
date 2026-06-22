import type { Collection } from "@/lib/products";
import { ProductCell } from "./product-cell";

/**
 * Gallery-style product grid — full-bleed.
 *
 * Layout is driven entirely by component-scoped CSS (the <style> below) so the
 * change stays isolated from globals.css. The grid fills its container edge to
 * edge (no left/right margins) and the cells flex to fill it, so the whole 3x2
 * grid sits above the fold without scrolling. Cell aspect ratio is free — the
 * piece is `object-contain` inside each cell so it's never cropped or distorted.
 *
 * Breakpoints:
 *  - >= 960px, or < 960px in landscape (enough horizontal room): 3 cols x 2 rows
 *  - < 960px in portrait (tablet/mobile): 2 cols x 3 rows
 *
 * Visual style: no borders, shadows, dividers or card chrome — the cells blend
 * into one continuous white plane.
 */
export function ProductGrid({ collection }: { collection: Collection }) {
  return (
    <>
      <style>{gridCss}</style>
      <ul className="ddc-grid">
        {collection.products.map((product) => (
          <ProductCell
            key={product.id}
            product={product}
            collectionSlug={collection.slug}
          />
        ))}
      </ul>
    </>
  );
}

const gridCss = `
.ddc-grid {
  display: grid;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0;
  width: 100%;
  height: 100%;
}

.ddc-cell {
  position: relative;
  min-width: 0;
  min-height: 0;
  background: transparent;
}

/* Portrait (tablet/mobile): 2 columns x 3 rows, filling the viewport. */
@media (max-width: 959.98px) and (orientation: portrait) {
  .ddc-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }
}

/* Wide (>=960px) or landscape: 3 columns x 2 rows, edge to edge, free aspect.
   Cells flex to fill the container so the full 3x2 stays above the fold. */
@media (min-width: 960px), (max-width: 959.98px) and (orientation: landscape) {
  .ddc-grid {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }
}
`;
