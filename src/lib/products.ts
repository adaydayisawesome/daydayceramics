/**
 * Product data model for Day Day Ceramics.
 *
 * Kept intentionally data-driven so the same shape can later be hydrated from
 * Shopify: every product carries `shopifyProductId` / `shopifyVariantId` hooks
 * (null for now) and the grid/detail routes read only from these helpers.
 *
 * IMAGES: there are no real product photos yet. Everything points at the single
 * placeholder `/images/tea-cup.png` (see PLACEHOLDER_IMAGE). Swap per-product
 * `defaultImage` / `alternateImage` / `spinMedia` when real assets land.
 */

/** Centralized placeholder image — replace per product once real photos exist. */
export const PLACEHOLDER_IMAGE = "/images/tea-cup.png";

export type HoverType = "staticOnly" | "alternateAngle" | "spin360";

export type Product = {
  id: string;
  slug: string;
  title: string;
  /** Price in whole currency units (USD). Ignored for display when isSold. */
  price: number;
  isSold: boolean;
  /** Static image always shown by default. */
  defaultImage: string;
  hoverType: HoverType;
  /** Second angle for `alternateAngle` crossfade. null otherwise. */
  alternateImage: string | null;
  /**
   * Base path (directory) for a 360 spin asset for `spin360`. A real pipeline
   * will later drop a `manifest.json` + frames here under /public/images/spin.
   * The grid component fetches the manifest and gracefully falls back to
   * `defaultImage` when the asset is missing/unavailable. null otherwise.
   */
  spinMedia: string | null;
  /** Shopify wiring — null until catalog is connected. */
  shopifyProductId: string | null;
  shopifyVariantId: string | null;
};

export type Collection = {
  slug: string;
  title: string;
  tagline: string;
  products: Product[];
};

export const collections: Collection[] = [
  {
    slug: "tableware",
    title: "Tableware",
    tagline: "Everyday pieces for the table — thrown, trimmed, and glazed by hand.",
    products: [
      {
        id: "tableware-01",
        slug: "dinner-plate",
        title: "Dinner Plate",
        price: 68,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "tableware-02",
        slug: "side-plate",
        title: "Side Plate",
        price: 48,
        isSold: false,
        // alternateAngle demo: alternateImage reuses the placeholder so the
        // crossfade is wired and visible. Replace with a real second angle.
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "alternateAngle",
        alternateImage: PLACEHOLDER_IMAGE,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "tableware-03",
        slug: "cereal-bowl",
        title: "Cereal Bowl",
        price: 52,
        isSold: false,
        // spin360 demo: points at a placeholder spin dir. Real frames are
        // produced by a separate pipeline and are gitignored, so this
        // gracefully falls back to defaultImage when the manifest is absent.
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "spin360",
        alternateImage: null,
        spinMedia: "/images/spin/cup-a",
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "tableware-04",
        slug: "soup-bowl",
        title: "Soup Bowl",
        price: 56,
        // sold demo: shows the "sold" pill + grayscale, stays clickable.
        isSold: true,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "tableware-05",
        slug: "stoneware-mug",
        title: "Stoneware Mug",
        price: 42,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "tableware-06",
        slug: "espresso-cup",
        title: "Espresso Cup",
        price: 38,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
    ],
  },
  {
    slug: "vases",
    title: "Vases",
    tagline: "Sculptural vessels for stems, branches, and quiet corners.",
    products: [
      {
        id: "vases-01",
        slug: "bud-vase",
        title: "Bud Vase",
        price: 64,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "vases-02",
        slug: "bottle-vase",
        title: "Bottle Vase",
        price: 88,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "alternateAngle",
        alternateImage: PLACEHOLDER_IMAGE,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "vases-03",
        slug: "moon-jar",
        title: "Moon Jar",
        price: 220,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "spin360",
        alternateImage: null,
        spinMedia: "/images/spin/cup-a",
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "vases-04",
        slug: "tall-cylinder",
        title: "Tall Cylinder",
        price: 96,
        isSold: true,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "vases-05",
        slug: "ikebana-vessel",
        title: "Ikebana Vessel",
        price: 74,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
      {
        id: "vases-06",
        slug: "pinched-vase",
        title: "Pinched Vase",
        price: 58,
        isSold: false,
        defaultImage: PLACEHOLDER_IMAGE,
        hoverType: "staticOnly",
        alternateImage: null,
        spinMedia: null,
        shopifyProductId: null,
        shopifyVariantId: null,
      },
    ],
  },
];

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}

/** Look up a product within a collection by its SLUG (not id). */
export function getProduct(collectionSlug: string, productSlug: string) {
  const collection = getCollection(collectionSlug);
  const product = collection?.products.find((p) => p.slug === productSlug);
  if (!collection || !product) return undefined;
  return { collection, product };
}

/** Formatted price label for the grid pill, e.g. "$68". */
export function priceLabel(price: number): string {
  return `$${price}`;
}
