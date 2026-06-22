import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Smile } from "lucide-react";
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
    <main className="flex h-[100svh] flex-col overflow-hidden bg-white font-[family-name:var(--font-figtree)] text-neutral-900">
      {/* Quiet header — circular icon buttons mirror the home "About" close
          button (40x40, 24px from the edge). Title is optically centered. */}
      <header className="relative flex items-center justify-between p-6">
        <Link
          href="/"
          aria-label="Back to home"
          className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#413E3F]"
        >
          <ChevronLeft className="size-5 text-[#413E3F] transition-colors group-hover:text-[#F8F5EE]" />
        </Link>

        <span className="absolute left-1/2 -translate-x-1/2 font-[family-name:var(--font-playfair)] text-[clamp(18px,2.4vw,24px)] leading-none font-extrabold tracking-[-0.01em] text-neutral-900 italic">
          {data.title}
        </span>

        {other ? (
          <Link
            href={`/collections/${other.slug}`}
            aria-label={`Go to ${other.title}`}
            className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#413E3F]"
          >
            <Smile className="size-5 text-[#413E3F] transition-colors group-hover:text-[#F8F5EE]" />
          </Link>
        ) : (
          <span className="h-10 w-10" />
        )}
      </header>

      <div className="min-h-0 flex-1">
        <ProductGrid collection={data} />
      </div>
    </main>
  );
}
