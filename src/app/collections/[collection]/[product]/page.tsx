import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { collections, getProduct, priceLabel } from "@/lib/products";

export function generateStaticParams() {
  return collections.flatMap((c) =>
    c.products.map((p) => ({ collection: c.slug, product: p.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}) {
  const { collection, product } = await params;
  const data = getProduct(collection, product);
  return {
    title: data ? `${data.product.title} — Day Day Ceramics` : "Product",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}) {
  const { collection, product } = await params;
  // Routing is keyed by SLUG (collection slug + product slug).
  const data = getProduct(collection, product);
  if (!data) notFound();

  const { collection: col, product: item } = data;

  // Shopify checkout hooks intentionally left clean for a later pass:
  //   item.shopifyProductId / item.shopifyVariantId
  // are null today; wire add-to-cart / checkout here once the catalog is live.

  return (
    <main className="flex min-h-[100svh] flex-col bg-white text-neutral-900">
      <header className="px-[clamp(16px,4vw,56px)] py-5">
        <Link
          href={`/collections/${col.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.18em] text-neutral-500 uppercase transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-3.5" /> {col.title}
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-6 py-6 md:flex-row md:items-center md:gap-16">
        <div className="relative aspect-square w-full max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.defaultImage}
            alt={item.title}
            className={`h-full w-full object-contain p-[8%] ${item.isSold ? "grayscale" : ""}`}
          />
        </div>

        <div className="flex flex-col items-start text-left md:flex-1">
          <p className="text-xs tracking-[0.32em] text-neutral-500 uppercase">
            {col.title}
          </p>
          <h1 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] leading-tight font-medium">
            {item.title}
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            {item.isSold ? "Sold" : priceLabel(item.price)}
          </p>

          <p className="mt-8 max-w-sm text-sm leading-relaxed text-neutral-500">
            Detail page is intentionally minimal for now. Checkout will connect
            to Shopify here later.
          </p>
        </div>
      </div>
    </main>
  );
}
