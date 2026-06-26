import Stripe from "stripe";

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

    const lineItems = await stripe.paymentLinks.listLineItems(paymentLinkId, {
      limit: 1,
    });
    const description = lineItems.data[0]?.description?.toLowerCase() ?? "";
    if (description.includes("raku white bowl")) return "raku-white-bowl";
  }

  return null;
}
