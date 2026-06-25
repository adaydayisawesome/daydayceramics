import { Redis } from "@upstash/redis";

import baselineSold from "./sold-slugs.generated.json";

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

/** Baseline + Redis runtime slugs (does not include catalog `isSold` flags). */
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
