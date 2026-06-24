"use client";

/**
 * Product DETAIL media: a featured tile plus a gallery of every photo.
 *
 * STATIC ONLY — the modal detail view intentionally does NOT play the 360°
 * turntable (the spin stays on the listing grid, in `product-cell.tsx`). The
 * featured tile shows the matted (transparent) hero, and below it the full
 * gallery shows each `detailImages` photo with its ORIGINAL background (these
 * are intentionally NOT matted) plus any `detailVideos`. Falls back to the
 * single `defaultImage` when there are no gallery photos.
 */
export function DetailMedia({
  title,
  defaultImage,
  detailImages,
  detailVideos = [],
  isSold,
}: {
  title: string;
  defaultImage: string;
  detailImages: string[];
  detailVideos?: string[];
  isSold: boolean;
}) {
  const grayscale = isSold ? "grayscale" : "";

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      {/* Featured tile — matted hero (static; no 360 spin in the modal). */}
      <div className="relative aspect-square w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={defaultImage}
          alt={title}
          className={`absolute inset-0 h-full w-full object-contain p-[8%] ${grayscale}`}
        />
      </div>

      {/* Gallery — every photo (original background kept, not matted) plus any
          extra clips that shipped with the piece, rendered as inline muted
          players so nothing from the drop is hidden. */}
      {(detailImages.length > 0 || detailVideos.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {detailImages.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-md bg-neutral-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${title} — view ${i + 1}`}
                loading="lazy"
                className={`absolute inset-0 h-full w-full object-cover ${grayscale}`}
              />
            </div>
          ))}
          {detailVideos.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden rounded-md bg-neutral-50"
            >
              <video
                src={src}
                muted
                controls
                playsInline
                loop
                preload="metadata"
                aria-label={`${title} — video ${i + 1}`}
                className={`absolute inset-0 h-full w-full object-cover ${grayscale}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
