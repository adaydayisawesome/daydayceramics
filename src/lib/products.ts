export type Product = {
  id: string;
  name: string;
  price: number;
  /** Placeholder tonal value (0..1) used for the grid swatch until real imagery is added. */
  tone: number;
};

export type Collection = {
  slug: string;
  title: string;
  tagline: string;
  /** Base hue (oklch) used to tint this collection's placeholder swatches. */
  hue: number;
  products: Product[];
};

const GRID_SIZE = 6;
export const GRID_CELLS = GRID_SIZE * GRID_SIZE; // 36

function buildProducts(prefix: string, names: string[]): Product[] {
  return Array.from({ length: GRID_CELLS }, (_, i) => {
    const name = names[i % names.length];
    const n = Math.floor(i / names.length) + 1;
    return {
      id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
      name: n > 1 ? `${name} No.${n}` : name,
      price: 38 + ((i * 7) % 120),
      tone: 0.42 + ((i % GRID_SIZE) / GRID_SIZE) * 0.34,
    };
  });
}

const tablewareNames = [
  "Dinner Plate",
  "Side Plate",
  "Cereal Bowl",
  "Soup Bowl",
  "Mug",
  "Espresso Cup",
  "Serving Platter",
  "Pasta Bowl",
];

const vaseNames = [
  "Bud Vase",
  "Bottle Vase",
  "Bulb Vase",
  "Ikebana Vessel",
  "Tall Cylinder",
  "Moon Jar",
  "Pinched Vase",
  "Carafe",
];

export const collections: Collection[] = [
  {
    slug: "tableware",
    title: "Tableware",
    tagline: "Everyday pieces for the table — thrown, trimmed, and glazed by hand.",
    hue: 70,
    products: buildProducts("tableware", tablewareNames),
  },
  {
    slug: "vases",
    title: "Vases",
    tagline: "Sculptural vessels for stems, branches, and quiet corners.",
    hue: 250,
    products: buildProducts("vases", vaseNames),
  },
];

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}

export function getProduct(slug: string, id: string) {
  const collection = getCollection(slug);
  const product = collection?.products.find((p) => p.id === id);
  if (!collection || !product) return undefined;
  return { collection, product };
}

/** oklch swatch color for a placeholder cell. */
export function swatch(hue: number, tone: number): string {
  return `oklch(${tone.toFixed(3)} 0.045 ${hue})`;
}
