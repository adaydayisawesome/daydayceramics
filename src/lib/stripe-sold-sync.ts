import Stripe from "stripe";

import { resolveSlugFromCheckoutSession } from "./stripe-resolve-slug";

const SYNC_TTL_MS = 30_000;
let cachedSlugs: string[] | null = null;
let cachedAt = 0;

/** True when the link has no one-checkout limit (completed_sessions never increments). */
function isUnlimitedPaymentLink(link: Stripe.PaymentLink): boolean {
  return link.restrictions?.completed_sessions?.limit == null;
}

async function hasPaidCheckoutForLink(
  stripe: Stripe,
  paymentLinkId: string
): Promise<boolean> {
  const sessions = await stripe.checkout.sessions.list({
    payment_link: paymentLinkId,
    status: "complete",
    limit: 10,
  });
  return sessions.data.some((s) => s.payment_status === "paid");
}

async function fetchSoldSlugsFromStripe(stripe: Stripe): Promise<string[]> {
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
      if (completed >= 1) {
        slugs.add(slug);
        continue;
      }

      if (isUnlimitedPaymentLink(link)) {
        try {
          if (await hasPaidCheckoutForLink(stripe, link.id)) slugs.add(slug);
        } catch (err) {
          console.error(
            `[stripe-sold-sync] checkout lookup failed for ${slug}:`,
            err
          );
        }
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data.at(-1)?.id;
  }

  // Fallback: scan recent paid checkout sessions (covers edge cases).
  try {
    startingAfter = undefined;
    for (;;) {
      const page = await stripe.checkout.sessions.list({
        status: "complete",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });

      for (const session of page.data) {
        if (session.payment_status !== "paid") continue;
        const slug = await resolveSlugFromCheckoutSession(stripe, session);
        if (slug) slugs.add(slug);
      }

      if (!page.has_more) break;
      startingAfter = page.data.at(-1)?.id;
    }
  } catch (err) {
    console.error("[stripe-sold-sync] checkout.sessions.list fallback failed:", err);
  }

  return [...slugs];
}

/** Live Stripe sold slugs (payment links + checkout sessions). */
export async function getStripeSoldSlugs(): Promise<string[]> {
  const now = Date.now();
  if (cachedSlugs && now - cachedAt < SYNC_TTL_MS) return cachedSlugs;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[stripe-sold-sync] STRIPE_SECRET_KEY not set — skipping sync");
    return [];
  }

  try {
    const stripe = new Stripe(key);
    cachedSlugs = await fetchSoldSlugsFromStripe(stripe);
    cachedAt = now;
    return cachedSlugs;
  } catch (err) {
    console.error("[stripe-sold-sync] Stripe API error:", err);
    return cachedSlugs ?? [];
  }
}
