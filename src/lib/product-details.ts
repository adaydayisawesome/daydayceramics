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
  /** Crack length, e.g. "1cm". Rendered as its own CRACK LENGTH row. */
  crackLength?: string;
  /** Cautionary note, e.g. "Not food safe". Rendered as its own WARNING row. */
  warning?: string;
  /**
   * Stripe payment-link URL. When set, the darling card's "Adopt it" button
   * navigates here (same tab) instead of running the cart stub.
   */
  checkoutUrl?: string;
};

export const PRODUCT_DETAILS: Record<string, ProductDetails> = {
  "bowl-in-dark-clay": {
    blurb:
      "A moody little bowl with ash-like speckles and a quiet storm inside.",
    clay: "B3 BROWN",
    temp: "CONE 5",
    measurement: "Di 6.76in, De 2.5in, Hi 2.75in",
  },
  "raku-white-bowl": {
    blurb:
      "A raku-fired, matcha-bowl-sized object with smoky crackles and quiet drama. Decorative only; not food safe.",
    clay: "Raku Sculpture",
    temp: "Raku firing",
    measurement: "Typical matcha bowl size",
    warning: "Not food safe",
    checkoutUrl: "https://buy.stripe.com/00w5kDby73WP9W6caB14400",
  },

  // --- Darling pieces. Spec VALUES are intentionally verbatim (mixed casing). ---
  "apple-melted": {
    blurb:
      "A glossy red apple in the middle of a tiny ceramic meltdown. Decorative only, emotionally very committed.",
    clay: "porcelain",
    temp: "Cone 5",
    measurement: "to be added",
  },
  "apple-with-a-hole": {
    blurb:
      "A glossy red apple with a dramatic little hole. Decorative only, mildly suspicious.",
    clay: "porcelain",
    temp: "Cone 5",
    measurement: "to be added",
  },
  "apple-peeled": {
    blurb:
      "A glossy ceramic apple caught mid-peel. Decorative only, strangely fresh, and very committed to the bit.",
    clay: "porcelain",
    temp: "Cone 5",
    measurement: "to be added",
  },
  "blue-vase": {
    blurb:
      "A small blue vase with a round little belly, soft speckles, and quiet ocean mood.",
    clay: "Bmix smooth",
    temp: "Cone 5",
    measurement: "Diameter: 4in; Tall: 3.5in",
  },
  "blue-wave-on-black-sand": {
    blurb:
      "A small blue cup with a wave-like glaze line over dark clay. Quiet, glossy, and a little oceanic.",
    clay: "Night",
    temp: "Cone 5",
    measurement: "Diameter: 3in; Tall: 3in",
  },
  "guava-cup": {
    blurb:
      "A soft green cup with a warm pink clay interior and a matching little saucer. Sweet, round, and good for tea, tiny snacks, or a very gentle mood.",
    clay: "BMix Smooth",
    temp: "Cone 5",
    measurement: "Cup: 3.5in x 2.5in; Saucer: 5in x 4.5in",
  },
  "guava-sharing-cup": {
    blurb:
      "A guava-colored little sharing cup with a lid that clearly has its own agenda. Good for tea, small pours, and tiny ceremonies.",
    clay: "BMix Smooth",
    temp: "Cone 5",
    measurement: "with lid: 4.5in x 5.5in",
  },
  "petal-matcha-bowl": {
    blurb:
      "A petal-shaped matcha bowl with a soft pink outside and blue-green interior. Gentle, floral, and good for tea, small desserts, or quiet table rituals.",
    clay: "BMix Smooth",
    temp: "Cone 5",
    measurement: "5.5in x 3in",
  },

  // --- Ugly pieces. No blurb; specs surface on the Q2 funnel step. ---
  "snow-cup": {
    clay: "porcelain",
    temp: "Cone 5",
    measurement: "3.5in x 2.5in",
    crackLength: "1cm",
  },
  "green-celadon-tasting-cup": {
    clay: "porcelain",
    temp: "Cone 5",
    measurement: "2.5in x 4in",
  },
};

/** Display metadata for a slug, or `undefined` if the piece has none. */
export function getProductDetails(slug: string): ProductDetails | undefined {
  return PRODUCT_DETAILS[slug];
}
