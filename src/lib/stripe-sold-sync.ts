import Stripe from "stripe";

const SYNC_TTL_MS = 30_000;
let cachedSlugs: string[] | null = null;
let cachedAt = 0;

/** Slugs whose Stripe payment link has at least one completed checkout. */
export async function getStripeSoldSlugs(): Promise<string[]> {
  const now = Date.now();
  if (cachedSlugs && now - cachedAt < SYNC_TTL_MS) return cachedSlugs;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[stripe-sold-sync] STRIPE_SECRET_KEY not set — skipping sync");
    return [];
  }

  const stripe = new Stripe(key);
  const slugs = new Set<string>();
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.paymentLinks.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const link of page.data) {
      const slug = link.metadata?.slug;
      if (!slug) continue;

      const completed = link.restrictions?.completed_sessions?.count ?? 0;
      if (completed >= 1) slugs.add(slug);
    }

    if (!page.has_more) break;
    startingAfter = page.data.at(-1)?.id;
  }

  cachedSlugs = [...slugs];
  cachedAt = now;
  return cachedSlugs;
}
