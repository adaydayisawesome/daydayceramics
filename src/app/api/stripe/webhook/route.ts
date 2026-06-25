import { revalidatePath } from "next/cache";
import Stripe from "stripe";

import { handleCheckoutCompleted } from "@/lib/stripe-webhook";

export const runtime = "nodejs";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const stripe = getStripe();
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      const { slug, persisted } = await handleCheckoutCompleted(session);
      if (slug) {
        console.info(
          `[stripe/webhook] Marked sold: ${slug} (persisted=${persisted})`
        );
        revalidatePath("/", "layout");
        revalidatePath("/collections/darling-babies");
        revalidatePath("/collections/ugly-babies");
      } else {
        console.warn(
          "[stripe/webhook] checkout.session.completed but slug unresolved:",
          session.id
        );
      }
    }
  }

  return Response.json({ received: true });
}
