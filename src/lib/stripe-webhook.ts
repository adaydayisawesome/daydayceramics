import Stripe from "stripe";

import { markSold } from "@/lib/sold-store";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

/** Resolve product slug from a completed Checkout Session (Payment Links). */
export async function resolveSlugFromCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<string | null> {
  if (session.metadata?.slug) return session.metadata.slug;

  const paymentLinkId =
    typeof session.payment_link === "string" ? session.payment_link : null;

  if (paymentLinkId) {
    const link = await stripe.paymentLinks.retrieve(paymentLinkId);
    if (link.metadata?.slug) return link.metadata.slug;

    // Raku White Bowl link was created before slug metadata was added.
    const lineItems = await stripe.paymentLinks.listLineItems(paymentLinkId, {
      limit: 1,
    });
    const description = lineItems.data[0]?.description?.toLowerCase() ?? "";
    if (description.includes("raku white bowl")) return "raku-white-bowl";
  }

  return null;
}

/** Deactivate every active payment link tagged with this slug (incl. ugly tiers). */
export async function deactivatePaymentLinksForSlug(
  stripe: Stripe,
  slug: string
): Promise<void> {
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.paymentLinks.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const link of page.data) {
      if (link.metadata?.slug === slug && link.active) {
        await stripe.paymentLinks.update(link.id, { active: false });
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data.at(-1)?.id;
  }
}

/** Handle checkout.session.completed — mark sold + close sibling links. */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<{ slug: string | null; persisted: boolean }> {
  const stripe = getStripe();
  const slug = await resolveSlugFromCheckoutSession(stripe, session);
  if (!slug) return { slug: null, persisted: false };

  const persisted = await markSold(slug);
  await deactivatePaymentLinksForSlug(stripe, slug);

  return { slug, persisted };
}
