import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProduct, swatch } from "@/lib/products";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ collection: string; product: string }>;
}) {
  const { collection, product } = await params;
  const data = getProduct(collection, product);
  if (!data) notFound();

  return (
    <main className="flex min-h-screen flex-col">
      <div className="p-4 sm:p-5">
        <Link
          href={`/collections/${data.collection.slug}`}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-xs font-medium tracking-[0.15em] uppercase transition hover:bg-neutral-200"
        >
          <ArrowLeft className="size-3.5" /> {data.collection.title}
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div
          className="mb-8 size-40 rounded-full"
          style={{ backgroundColor: swatch(data.collection.hue, data.product.tone) }}
        />
        <p className="text-xs tracking-[0.4em] text-muted-foreground uppercase">
          {data.collection.title}
        </p>
        <h1 className="mt-4 text-[clamp(2rem,6vw,4rem)] leading-tight font-medium">
          {data.product.name}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          ${data.product.price}
        </p>
        <p className="mt-8 max-w-sm rounded-lg border border-dashed border-border px-5 py-4 text-sm text-muted-foreground">
          Product page is paused for now — this is a placeholder. Checkout will
          connect to Shopify here later.
        </p>
      </div>
    </main>
  );
}
