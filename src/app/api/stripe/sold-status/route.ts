import { NextResponse } from "next/server";

import { baselineSoldSlugs, getRuntimeSoldSlugs } from "@/lib/sold-store";
import { getStripeSoldSlugs } from "@/lib/stripe-sold-sync";

/** Debug endpoint: verify Stripe sync on Vercel. */
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

  const stripeEnvKeys = Object.keys(process.env)
    .filter((name) => /STRIPE|UPSTASH|KV_REST/i.test(name))
    .sort();

  try {
    const [runtime, fromStripe] = await Promise.all([
      getRuntimeSoldSlugs(),
      getStripeSoldSlugs(),
    ]);

    return NextResponse.json({
      ok: true,
      keyConfigured: Boolean(key),
      keyMode,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
      stripeRelatedEnvKeys: stripeEnvKeys,
      baselineCount: baselineSoldSlugs().size,
      stripeCount: fromStripe.length,
      runtimeCount: runtime.size,
      stripeSlugs: fromStripe.sort(),
      runtimeSlugs: [...runtime].sort(),
      hint: key
        ? null
        : "STRIPE_SECRET_KEY is missing at runtime. Add it under Vercel → Project → Settings → Environment Variables with Production checked, then Redeploy. Or use GitHub Actions sync (see README).",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        keyConfigured: Boolean(key),
        keyMode,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        stripeRelatedEnvKeys: stripeEnvKeys,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
