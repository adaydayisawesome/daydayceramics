import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";

import { ShippingCollapsible } from "./shipping-collapsible";

const bodyClass =
  "font-[family-name:var(--font-figtree)] text-[18px] leading-[1.4] font-normal";

const subheadingClass =
  "font-[family-name:var(--font-figtree)] text-[20px] leading-none font-bold";

/**
 * The About story — a single, centered column: the bio followed by the
 * Shipping & Returns policy.
 *
 * Self-contained and positioning-agnostic: it anchors its decorative hands to
 * the nearest positioned ancestor, so it works both inside the V1 modal
 * (`AboutInterstitial`) and as an in-flow scroll section on the DAY page. It
 * inherits text color from its parent (INK on the cream background).
 *
 * The column is intentionally narrow and centered so the decorative corner
 * hands frame the text without overlapping it.
 *
 * `showHands` (default true) draws the decorative corner hands. The DAY scroll
 * experience sets it to false because it supplies its own scroll-animated hands
 * (they travel from the center of the circle out to the corners as the story
 * reveals), so the static corner hands would double up.
 */
export function AboutContent({ showHands = true }: { showHands?: boolean }) {
  return (
    <>
      {showHands && (
        <>
          {/* Decorative "Creation of Adam" hands, broken apart and anchored to
              opposite corners to frame the text. Behind the content (z-0) and
              non-interactive so they never block the close button or links. */}
          <Image
            src="/images/about/hand-top-right.webp"
            alt=""
            aria-hidden
            width={862}
            height={652}
            className="pointer-events-none absolute top-0 right-0 z-0 h-auto w-[34vw] max-w-[420px] min-w-[120px] select-none md:w-[clamp(200px,26vw,420px)]"
            style={{
              maskImage: "linear-gradient(to right, #000 58%, transparent 92%)",
              WebkitMaskImage:
                "linear-gradient(to right, #000 58%, transparent 92%)",
            }}
            priority
          />
          {/* Desktop: bottom-left hand anchored to the corner. On mobile the
              column is tall and scrolling, so the bottom hand is rendered
              in-flow at the very end instead. */}
          <Image
            src="/images/about/hand-bottom-left.webp"
            alt=""
            aria-hidden
            width={898}
            height={587}
            className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-auto w-[clamp(200px,26vw,420px)] select-none md:block"
            style={{
              maskImage: "linear-gradient(to left, #000 58%, transparent 92%)",
              WebkitMaskImage:
                "linear-gradient(to left, #000 58%, transparent 92%)",
            }}
            priority
          />
        </>
      )}

      {/* Centered column. `min-h-[100svh]` + `items-center` vertically centers
          the story in the viewport when it fits, and lets it scroll within the
          overflow-y-auto parent when it doesn't. The single column is roughly
          the width of two of the old three columns so the corner hands don't
          overlap it. */}
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-6 py-24 md:px-[140px]">
        <div className="w-full max-w-[760px]">
          {/* Bio. */}
          <p className={bodyClass}>
            Hi, I&apos;m <strong className="font-bold">Huilin</strong>, a
            designer and ceramic artist exploring pottery through use, touch, and
            everyday ritual.
          </p>
          <p className={`${bodyClass} mt-4`}>
            My work often begins with objects meant to be held—things that live
            close to the body. Coming from a design background, I care deeply
            about function, proportion, and the experience of use; but I am also
            drawn to clay&apos;s wonky, accidental, and emotionally specific
            nature.
          </p>
          <p className={`${bodyClass} mt-4`}>
            Once in a while, I also make non-functional pieces as a way to play,
            wander, and let ideas loosen up. For me, clay is both a material for
            making useful objects and a place for curiosity, failure, and small
            discoveries.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex h-6 cursor-pointer items-center rounded-full border border-[#413E3F] bg-transparent px-3 font-[family-name:var(--font-figtree)] text-[11px] font-semibold tracking-wide text-[#413E3F] transition-colors hover:bg-[#03F94D]"
            >
              VIEW GALLERY
            </Link>

            <a
              href="https://www.instagram.com/dayday.ceramics/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex cursor-pointer text-[#413E3F] transition-opacity hover:opacity-70"
            >
              {/* lucide-react v1 dropped brand icons (no Instagram export),
                  so this is an inline SVG matching lucide's icon style. */}
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>

            <a
              href="mailto:huilindesign@gmail.com"
              aria-label="Email"
              className="inline-flex cursor-pointer text-[#413E3F] transition-opacity hover:opacity-70"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>

          {/* Shipping & Returns — sits below the About bio, same single column.
              "Returns & Exchanges" leads (always visible); the remaining
              sections are collapsed-by-default accordions. */}
          <div className="mt-16">
            <h2 className={subheadingClass}>Returns &amp; Exchanges</h2>
            <p className={`${bodyClass} mt-6`}>
              All sales are final. I do not accept returns or exchanges for
              change of mind, small handmade variations, or expected
              imperfections that are shown or described in the listing.
            </p>
            <p className={`${bodyClass} mt-4`}>
              Each piece is handmade, so small irregularities are part of the
              object, not a defect.
            </p>

            <div className="mt-8">
              <ShippingCollapsible title="Shipping Damage" id="shipping-damage">
                <p>
                  I pack each piece with care, but ceramics are fragile and
                  shipping can be rude.
                </p>
                <p className="mt-4">
                  If your piece arrives damaged, please contact me within 3 days
                  of delivery with clear photos of the item, packaging, and
                  shipping box.
                </p>
                <p className="mt-4">
                  Once confirmed, I’ll work with you on a fair resolution based
                  on the condition of the piece and the severity of the damage.
                  Since each piece is one of a kind, replacements are usually not
                  possible, but I’ll do my best to make it right.
                </p>
                <p className="mt-4">
                  Damage claims must be supported with photos of both the damaged
                  piece and the packaging. This helps me improve future packing
                  and, when applicable, file a claim with the carrier.
                </p>
              </ShippingCollapsible>

              <ShippingCollapsible title="Shipping" id="shipping">
                <p>Shipping fees are non-refundable.</p>
                <p className="mt-4">
                  For U.S. shipping, rates are estimated based on the size,
                  weight, and fragility of each piece. Small pieces usually ship
                  for around $15, while medium pieces usually ship for around
                  $25. Large, oversized, or extra-fragile pieces may require a
                  separate shipping quote.
                </p>
                <p className="mt-4">
                  Each piece will be packed carefully before it goes out into the
                  world, because apparently ceramics are dramatic.
                </p>
              </ShippingCollapsible>

              <ShippingCollapsible
                title="Local Pickup & Delivery"
                id="local-pickup-delivery"
              >
                <p>Local pickup is free of charge.</p>
                <p className="mt-4">
                  Local delivery may be available within San Francisco, San Mateo
                  County, Palo Alto, and Santa Clara County. Nearby delivery is
                  free.
                </p>
                <p className="mt-4">
                  Bridge tolls apply when delivery requires crossing a bridge.
                  The farthest bridge-accessible areas I can consider are Marin
                  County and Alameda County; beyond that, shipping will be
                  required.
                </p>
                <p className="mt-4">
                  Please contact me before purchase if you would like local
                  pickup or delivery so I can confirm it works.
                </p>
              </ShippingCollapsible>
            </div>
          </div>

          {/* Mobile-only bottom-left hand: rendered in the content flow so it
              lands at the very bottom of the story. Bleeds to the left/bottom
              edges to mirror the desktop corner. */}
          {showHands && (
            <div className="md:hidden">
              <Image
                src="/images/about/hand-bottom-left.webp"
                alt=""
                aria-hidden
                width={898}
                height={587}
                className="pointer-events-none -mb-24 -ml-6 mt-12 h-auto w-[60vw] max-w-[360px] min-w-[160px] select-none"
                style={{
                  maskImage:
                    "linear-gradient(to left, #000 58%, transparent 92%)",
                  WebkitMaskImage:
                    "linear-gradient(to left, #000 58%, transparent 92%)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
