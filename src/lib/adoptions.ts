/**
 * Ugly-babies ADOPTION FUNNEL copy, keyed by product slug.
 *
 * The product modal walks an ugly piece through: Q1 (the shared question, lives
 * in the modal) → Q2 (per-item, with a photo carousel) → Q3 (per-item, two
 * flavor choices that both advance) → a price step (single-select of 3 options
 * + "Adopt it!"). Darling pieces have no entry here and open straight to detail.
 *
 * Add/adjust a funnel by editing the entry for that slug — no modal wiring
 * needed. Slugs match `product-assets.generated.json` (verified):
 *   green-celadon-tasting-cup, snow-cup, raku-yellow-ash-tray.
 */

export type PriceOption = {
  /** Whole-dollar amount. */
  amount: number;
  /** Flavor label shown beside the price. */
  label: string;
};

export type AdoptionFlow = {
  /** Q2 — per-item question shown WITH the photo carousel. */
  q2: { body: string; advanceLabel: string; quitLabel: string };
  /** Q3 — per-item; BOTH buttons advance to the price step (no quit). */
  q3: { body: string; leftLabel: string; rightLabel: string };
  /** Price step — single-select; "Adopt it!" enabled once one is picked. */
  prices: PriceOption[];
};

export const ADOPTIONS: Record<string, AdoptionFlow> = {
  "green-celadon-tasting-cup": {
    q2: {
      body: "This baby was born during a glaze identity crisis. Its body is thin, useful, and perfectly fine — but its surface arrived with uneven moods and one tiny freckle. Are you okay with emotional glaze?",
      advanceLabel: "I support emotional glaze",
      quitLabel: "Ugg…",
    },
    q3: {
      body: "Can you promise to love it — not forever, just for now?",
      leftLabel: "Yes, for now",
      rightLabel: "just let me buy it",
    },
    prices: [
      { amount: 15, label: "I can love a freckle" },
      { amount: 20, label: "I support glaze drama" },
      { amount: 25, label: "This baby deserves a future" },
    ],
  },

  "snow-cup": {
    q2: {
      body: "This baby was almost promoted to Darling. The shape, rim, and thickness all behaved beautifully — but there is a small crack on the outside bottom. It does not affect drinking, and you usually won't see it, but with long-term use, the crack may grow. Can you love a nearly perfect baby with a hidden weakness?",
      advanceLabel: "Yes",
      quitLabel: "I'm having second thoughts",
    },
    q3: {
      body: "What kind of emotional liquid will this baby carry?",
      leftLabel: "Tea",
      rightLabel: "Coffee",
    },
    prices: [
      { amount: 18, label: "I can love a freckle" },
      { amount: 28, label: "I support glaze drama" },
      { amount: 35, label: "This baby deserves a future" },
    ],
  },

  "raku-yellow-ash-tray": {
    q2: {
      body: "Though I hate to admit it, every parent has a least favorite child—even when that child has done absolutely nothing wrong. It came from a raku firing, which means it is not food-safe and should live a decorative life. Its only real crime is that I personally do not enjoy its color. Can you adopt a baby rejected by its own maker?",
      advanceLabel: "Yes, I see its truth",
      quitLabel: "I'm having second thoughts",
    },
    q3: {
      body: "Where should this baby quietly exist?",
      leftLabel: "On a shelf",
      rightLabel: "Near a window",
    },
    prices: [
      { amount: 15, label: "Decorative Custodian" },
      { amount: 20, label: "I Respect the Raku Chaos" },
      { amount: 25, label: "Nature did her best" },
    ],
  },
};

/** The adoption funnel for a slug, or `undefined` if the piece has none. */
export function getAdoptionFlow(slug: string): AdoptionFlow | undefined {
  return ADOPTIONS[slug];
}
