import { NextResponse } from "next/server";

import { baselineSoldSlugs, getRuntimeSoldSlugs } from "@/lib/sold-store";
import { getStripeSoldSlugs } from "@/lib/stripe-sold-sync";

/** Debug endpoint: verify Stripe sync on Vercel (remove or protect in prod later). */
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  const keyMode = key?.startsWith("sk_live_")
    ? "live"
    : key?.startsWith("sk_test_")
      ? "test"
      : key
        ? "unknown"
        : "missing";

  try {
    const [runtime, fromStripe] = await Promise.all([
      getRuntimeSoldSlugs(),
      getStripeSoldSlugs(),
    ]);

    return NextResponse.json({
      ok: true,
      keyConfigured: Boolean(key),
      keyMode,
      baselineCount: baselineSoldSlugs().size,
      stripeCount: fromStripe.length,
      runtimeCount: runtime.size,
      stripeSlugs: fromStripe.sort(),
      runtimeSlugs: [...runtime].sort(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        keyConfigured: Boolean(key),
        keyMode,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
