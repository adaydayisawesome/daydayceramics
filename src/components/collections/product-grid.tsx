import type { Collection } from "@/lib/products";
import { ProductCell } from "./product-cell";

/**
 * Gallery-style product grid.
 *
 * Layout is driven entirely by component-scoped CSS (the <style> below) so the
 * change stays isolated from globals.css. Cells are perfect squares whose size
 * is the smaller of the available width-per-column and height-per-row, so the
 * full 3x2 grid stays above the fold without vertical scroll on wide viewports.
 *
 * Breakpoints:
 *  - >= 960px, or < 960px in landscape (enough horizontal room): 3 cols x 2 rows
 *  - < 960px in portrait (tablet/mobile): 2 cols x 3 rows
 *
 * Visual style: no borders, shadows, dividers or card chrome — the cells blend
 * into one continuous white plane with even spacing.
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
  --ddc-gap: clamp(14px, 2.4vw, 30px);
  --ddc-pad-x: clamp(16px, 4vw, 56px);
  /* Vertical chrome reserved for the header bar + breathing room. */
  --ddc-chrome: 7.5rem;
  --ddc-avail-h: calc(100svh - var(--ddc-chrome));

  display: grid;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--ddc-gap);
  justify-content: center;
  align-content: center;
}

.ddc-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  background: transparent;
}

/* Portrait (tablet/mobile): 2 columns x 3 rows. Scrolling is acceptable here. */
@media (max-width: 959.98px) and (orientation: portrait) {
  .ddc-grid {
    --ddc-cell: calc((100vw - 2 * var(--ddc-pad-x) - var(--ddc-gap)) / 2);
    grid-template-columns: repeat(2, var(--ddc-cell));
    grid-auto-rows: var(--ddc-cell);
  }
}

/* Wide (>=960px) or landscape: 3 columns x 2 rows, sized to fit above the fold.
   The cell is the smaller of width-per-column and height-per-row, so two rows
   of squares never overflow the viewport height. */
@media (min-width: 960px), (max-width: 959.98px) and (orientation: landscape) {
  .ddc-grid {
    --ddc-cell: min(
      calc((100vw - 2 * var(--ddc-pad-x) - 2 * var(--ddc-gap)) / 3),
      calc((var(--ddc-avail-h) - var(--ddc-gap)) / 2)
    );
    grid-template-columns: repeat(3, var(--ddc-cell));
    grid-auto-rows: var(--ddc-cell);
  }
}
`;
