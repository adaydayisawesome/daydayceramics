import { Redis } from "@upstash/redis";

import baselineSold from "./sold-slugs.generated.json";
import { getStripeSoldSlugs } from "./stripe-sold-sync";

const KV_KEY = "sold-slugs";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** Baseline slugs from the committed JSON file. */
export function baselineSoldSlugs(): Set<string> {
  return new Set(baselineSold as string[]);
}

/**
 * Baseline + Redis (webhook) + live Stripe payment-link state.
 * Stripe sync is the fallback when webhook/Redis aren't configured yet.
 */
export async function getRuntimeSoldSlugs(): Promise<Set<string>> {
  const slugs = baselineSoldSlugs();

  const redis = getRedis();
  if (redis) {
    try {
      const fromRedis = (await redis.smembers(KV_KEY)) as string[];
      for (const slug of fromRedis) slugs.add(slug);
    } catch (err) {
      console.error("[sold-store] Redis read failed:", err);
    }
  }

  try {
    const fromStripe = await getStripeSoldSlugs();
    for (const slug of fromStripe) slugs.add(slug);
  } catch (err) {
    console.error("[sold-store] Stripe sold sync failed:", err);
  }

  return slugs;
}

/** Record a slug as sold (idempotent). Returns false if Redis is not configured. */
export async function markSold(slug: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    console.warn(
      "[sold-store] Redis not configured — cannot persist sold slug:",
      slug
    );
    return false;
  }

  await redis.sadd(KV_KEY, slug);
  return true;
}

/** Whether Redis env vars are present (webhook can persist). */
export function isSoldStoreConfigured(): boolean {
  return getRedis() !== null;
}
