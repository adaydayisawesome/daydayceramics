import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { collections, getCollection } from "@/lib/products";
import { ProductGrid } from "@/components/collections/product-grid";

export function generateStaticParams() {
  return collections.map((c) => ({ collection: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const data = getCollection(collection);
  return { title: data ? `${data.title} — Day Day Ceramics` : "Collection" };
}

export default async function CollectionGridPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  const data = getCollection(collection);
  if (!data) notFound();

  const other = collections.find((c) => c.slug !== data.slug);

  return (
    <main className="flex min-h-[100svh] flex-col bg-white text-neutral-900">
      {/* Quiet header — intentionally chrome-light so the grid reads as one plane. */}
      <header className="flex items-center justify-between gap-4 px-[clamp(16px,4vw,56px)] py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium tracking-[0.18em] text-neutral-500 uppercase transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="size-3.5" /> Home
        </Link>
        <span className="text-xs font-medium tracking-[0.28em] text-neutral-900 uppercase">
          {data.title}
        </span>
        {other ? (
          <Link
            href={`/collections/${other.slug}`}
            className="text-xs font-medium tracking-[0.18em] text-neutral-500 uppercase transition-colors hover:text-neutral-900"
          >
            {other.title}
          </Link>
        ) : (
          <span className="w-12" />
        )}
      </header>

      <div className="flex flex-1 items-center justify-center py-4">
        <ProductGrid collection={data} />
      </div>
    </main>
  );
}
