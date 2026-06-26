#!/usr/bin/env node
/**
 * Sync adopted slugs from Stripe payment links into committed catalog files.
 * Used by GitHub Actions (STRIPE_SECRET_KEY in repo secrets) and locally.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const soldSlugsPath = join(root, "src/lib/sold-slugs.generated.json");
const assetsPath = join(root, "src/lib/product-assets.generated.json");

/** Always adopted — sold before Stripe / not on a payment link. */
const MANUAL_SLUGS = ["mug-with-half-heart-handle"];

function isUnlimitedPaymentLink(link) {
  return link.restrictions?.completed_sessions?.limit == null;
}

async function hasPaidCheckoutForLink(stripe, paymentLinkId) {
  const sessions = await stripe.checkout.sessions.list({
    payment_link: paymentLinkId,
    status: "complete",
    limit: 10,
  });
  return sessions.data.some((s) => s.payment_status === "paid");
}

async function fetchSoldSlugsFromStripe(stripe) {
  const slugs = new Set(MANUAL_SLUGS);
  let startingAfter;

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
        if (await hasPaidCheckoutForLink(stripe, link.id)) slugs.add(slug);
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data.at(-1)?.id;
  }

  return [...slugs].sort();
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function saveJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function slugToAssetKey(slug, assets) {
  for (const key of Object.keys(assets)) {
    if (key.endsWith(`/${slug}`)) return key;
  }
  return null;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set");
    process.exit(1);
  }

  const stripe = new Stripe(key);
  const fromStripe = await fetchSoldSlugsFromStripe(stripe);
  console.log("Stripe adopted slugs:", fromStripe.join(", "));

  const previous = loadJson(soldSlugsPath);
  const soldSet = new Set(fromStripe);
  const next = fromStripe;

  const assets = loadJson(assetsPath);
  let assetsChanged = false;

  for (const slug of soldSet) {
    const key = slugToAssetKey(slug, assets);
    if (key && assets[key].isSold !== true) {
      assets[key] = { ...assets[key], isSold: true };
      assetsChanged = true;
      console.log(`Marked isSold in assets: ${slug}`);
    }
  }

  const slugsChanged =
    previous.length !== next.length ||
    previous.some((s, i) => s !== next[i]);

  if (slugsChanged) {
    saveJson(soldSlugsPath, next);
    console.log("Updated sold-slugs.generated.json");
  }

  if (assetsChanged) {
    saveJson(assetsPath, assets);
    console.log("Updated product-assets.generated.json");
  }

  if (!slugsChanged && !assetsChanged) {
    console.log("No catalog changes needed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
