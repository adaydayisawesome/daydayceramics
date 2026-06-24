import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Smile } from "lucide-react";
import { collections, collectionCells, getCollection } from "@/lib/products";
import { ProductGrid } from "@/components/collections/product-grid";
import { DayMark } from "@/components/day-mark";

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
    <main className="flex flex-col bg-[#FAF5ED] font-[family-name:var(--font-figtree)] text-neutral-900">
      {/* Quiet header — circular icon buttons mirror the home "About" close
          button (40x40, 24px from the edge). No center title. Sticky so the
          back / smiley nav stays reachable on long, scrolling grids; its 88px
          height feeds the grid's `--ddc-header-h` row math. */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[#FAF5ED] p-6">
        <Link
          href="/"
          aria-label="Back to home"
          className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#03F94D]"
        >
          <ChevronLeft className="size-5 text-[#413E3F] transition-colors" />
        </Link>

        {/* Centered DAY logo mark (same mark as the home footer). */}
        <DayMark
          width={56}
          height={28}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#413E3F]"
        />

        {other ? (
          <Link
            href={`/collections/${other.slug}`}
            aria-label={`Go to ${other.title}`}
            className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#03F94D]"
          >
            <Smile className="size-5 text-[#413E3F] transition-colors" />
          </Link>
        ) : (
          <span className="h-10 w-10" />
        )}
      </header>

      <div className="flex-1">
        <ProductGrid cells={collectionCells(data)} />
      </div>
    </main>
  );
}
