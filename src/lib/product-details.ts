/**
 * Optional DISPLAY metadata for the ticket-style product modal, keyed by
 * product slug (mirrors how `adoptions.ts` keys per-item funnel copy).
 *
 * Every field is optional: the modal renders a row ONLY when its value is
 * present, so pieces without an entry (or with partial data) still look clean.
 * The same spec rows (CLAY | TEMP, MEASUREMENT) are reused by BOTH the darling
 * card and the ugly funnel steps — so adding clay/temp/measurement here will
 * surface those rows wherever that piece is shown.
 *
 * Only the demo entry is populated for now; do not invent data for other
 * pieces. Slugs match `product-assets.generated.json` / `products.ts`.
 */
export type ProductDetails = {
  /** Short descriptive blurb (Figtree 18px body). */
  blurb?: string;
  /** Clay body, e.g. "B3 BROWN". */
  clay?: string;
  /** Firing temperature, e.g. "CONE 5". */
  temp?: string;
  /** Dimensions string, e.g. "Di 6.76in, De 2.5in, Hi 2.75in". */
  measurement?: string;
};

export const PRODUCT_DETAILS: Record<string, ProductDetails> = {
  "bowl-in-dark-clay": {
    blurb:
      "A moody little bowl with ash-like speckles and a quiet storm inside.",
    clay: "B3 BROWN",
    temp: "CONE 5",
    measurement: "Di 6.76in, De 2.5in, Hi 2.75in",
  },
};

/** Display metadata for a slug, or `undefined` if the piece has none. */
export function getProductDetails(slug: string): ProductDetails | undefined {
  return PRODUCT_DETAILS[slug];
}
