import Stripe from "stripe";
import { unstable_cache } from "next/cache";

/** Slugs whose Stripe payment link has at least one completed checkout. */
async function fetchSoldSlugsFromStripe(): Promise<string[]> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return [];

  const stripe = new Stripe(key);
  const slugs: string[] = [];
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
      if (completed >= 1) {
        slugs.push(slug);
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data.at(-1)?.id;
  }

  return slugs;
}

/** Cached Stripe lookup — works without Redis/webhook once STRIPE_SECRET_KEY is on Vercel. */
export const getStripeSoldSlugs = unstable_cache(
  fetchSoldSlugsFromStripe,
  ["stripe-sold-slugs"],
  { revalidate: 60 }
);
