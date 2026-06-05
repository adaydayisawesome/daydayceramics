import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { collections, getCollection, swatch } from "@/lib/products";

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
    <main className="relative">
      {/* Floating chrome so the grid itself stays full-bleed */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-4 p-4 sm:p-5">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-medium tracking-[0.15em] uppercase shadow-sm backdrop-blur transition hover:bg-white"
        >
          <ArrowLeft className="size-3.5" /> Home
        </Link>
        <span className="rounded-full bg-neutral-950/85 px-4 py-2 text-xs font-medium tracking-[0.25em] text-white uppercase backdrop-blur">
          {data.title}
        </span>
        {other ? (
          <Link
            href={`/collections/${other.slug}`}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-xs font-medium tracking-[0.15em] uppercase shadow-sm backdrop-blur transition hover:bg-white"
          >
            {other.title}
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* 6×6 grid — fills the viewport on desktop, scrollable 2-up on mobile */}
      <div className="md:h-[100svh] md:overflow-hidden">
        <ul className="grid auto-rows-[44vw] grid-cols-2 gap-px bg-border sm:auto-rows-[33vw] sm:grid-cols-3 md:h-full md:auto-rows-auto md:grid-cols-6 md:grid-rows-6">
          {data.products.map((product, i) => (
            <li key={product.id} className="relative">
              <Link
                href={`/collections/${data.slug}/${product.id}`}
                className="group relative flex h-full w-full flex-col justify-end overflow-hidden p-3 text-left"
                style={{ backgroundColor: swatch(data.hue, product.tone) }}
              >
                <span className="absolute top-2.5 left-3 text-[0.65rem] font-medium tracking-[0.15em] text-black/40">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Hover wash */}
                <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" />

                <span className="relative translate-y-1 opacity-90 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="block text-sm leading-tight font-medium text-neutral-900">
                    {product.name}
                  </span>
                  <span className="text-xs text-neutral-900/70">
                    ${product.price}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
