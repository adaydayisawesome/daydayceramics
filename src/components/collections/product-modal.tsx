"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";

import { Sparkle } from "@/components/icons/sparkle";
import { getAdoptionFlow } from "@/lib/adoptions";
import { getProductDetails } from "@/lib/product-details";
import type { ProductDetails } from "@/lib/product-details";
import type { Product } from "@/lib/products";
import { getCollection, priceLabel } from "@/lib/products";
import { PhotoCarousel } from "./photo-carousel";

const MARKER_GREEN = "#03F94D";
const INK = "#413E3F";

// Body copy sizing/family lifted from About (`bodyClass`) so questions/blurbs
// read at the same scale across the site.
const BODY_CLASS =
  "font-[family-name:var(--font-figtree)] text-[18px] leading-[1.4] font-normal text-[#413E3F]";
// Small uppercase section label (gray, tracked-out).
const LABEL_CLASS =
  "font-[family-name:var(--font-figtree)] text-[12px] uppercase tracking-[0.14em] text-neutral-500";
// Piece title.
const TITLE_CLASS =
  "font-[family-name:var(--font-figtree)] text-[20px] leading-tight font-bold text-[#413E3F]";
// Spec value (clay / temp / measurement / price).
const VALUE_CLASS =
  "font-[family-name:var(--font-figtree)] text-[18px] font-bold text-[#413E3F]";

// Action pills.
const PILL_BASE =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] px-6 font-[family-name:var(--font-figtree)] text-[15px] font-semibold tracking-wide text-[#413E3F] whitespace-nowrap transition-colors";
const PILL_FILLED = `${PILL_BASE} bg-[#03F94D] hover:bg-[#02D944]`;
const PILL_OUTLINE = `${PILL_BASE} bg-transparent hover:bg-[#03F94D]`;

// Full-bleed dashed perforation divider between ticket sections.
const DASH = "border-[#413E3F]/25";

// ---------------------------------------------------------------------------
// Ticket SHAPE — punched out of the cream card with CSS radial-gradient masks.
//
// Three mask layers, composited with `intersect` so the card shows only where
// ALL layers are opaque (i.e. the UNION of the transparent circles becomes
// holes):
//   1. left side notch  — half-circle on the left edge at the first perforation
//   2. right side notch — half-circle on the right edge, same height
//   3. scalloped bottom — a full-height tile repeated across X with a small
//      half-circle at its bottom-center, giving the torn-ticket bottom edge
//
// `NOTCH_Y` matches the carousel height (256px) so the side notches land on the
// first dashed divider. The shape adapts to the card's auto height because the
// scallop tile is `… 100%` tall and pinned to the bottom.
// ---------------------------------------------------------------------------
const CAROUSEL_H = 256; // keep in sync with PhotoCarousel's h-64
const NOTCH_Y = CAROUSEL_H;
const NOTCH_R = 14;
const SCALLOP_R = 9;

const notchLeft = `radial-gradient(circle ${NOTCH_R}px at left ${NOTCH_Y}px, transparent ${NOTCH_R}px, #000 ${NOTCH_R + 1}px)`;
const notchRight = `radial-gradient(circle ${NOTCH_R}px at right ${NOTCH_Y}px, transparent ${NOTCH_R}px, #000 ${NOTCH_R + 1}px)`;
const scallop = `radial-gradient(circle ${SCALLOP_R}px at 50% 100%, transparent ${SCALLOP_R}px, #000 ${SCALLOP_R + 1}px)`;

const TICKET_MASK: CSSProperties = {
  WebkitMaskImage: `${notchLeft}, ${notchRight}, ${scallop}`,
  maskImage: `${notchLeft}, ${notchRight}, ${scallop}`,
  WebkitMaskRepeat: "no-repeat, no-repeat, repeat-x",
  maskRepeat: "no-repeat, no-repeat, repeat-x",
  WebkitMaskPosition: "left top, right top, left bottom",
  maskPosition: "left top, right top, left bottom",
  WebkitMaskSize: `100% 100%, 100% 100%, ${SCALLOP_R * 2}px 100%`,
  maskSize: `100% 100%, 100% 100%, ${SCALLOP_R * 2}px 100%`,
  WebkitMaskComposite: "source-in",
  maskComposite: "intersect",
};

// Q1 — the SHARED ugly-babies gate question (same for every ugly piece). The
// per-item Q2/Q3/price copy lives in `src/lib/adoptions.ts`.
const SHARED_Q1 = {
  body: (
    <>
      This baby has been labeled Ugly for documented reasons. It may be early,
      odd, or imperfect — but it survived the kiln, my judgment, and the general
      cruelty of taste. Would you like to meet it properly?
    </>
  ),
  advanceLabel: "Show me the damage",
  closeLabel: "I'm not emotionally ready",
};

// Two small neon-green sparkles tucked near the bottom corners of the ticket.
function CornerSparkles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 select-none">
      <span className="sparkle-twinkle absolute bottom-7 left-4">
        <Sparkle size={18} color={MARKER_GREEN} />
      </span>
      <span
        className="sparkle-twinkle absolute right-4 bottom-8"
        style={{ animationDelay: "0.8s" }}
      >
        <Sparkle size={14} color={MARKER_GREEN} />
      </span>
    </div>
  );
}

/**
 * The reusable SPEC rows — the same CLAY | TEMP two-column block (split by a
 * vertical dashed divider) and MEASUREMENT row used by BOTH the darling card
 * and the ugly funnel steps. Returns one node per present spec section (each
 * becomes its own dashed-divided ticket section); an empty array when there's
 * nothing to show, so missing data renders no row/divider at all.
 */
function specNodes(d?: ProductDetails): ReactNode[] {
  if (!d) return [];
  const nodes: ReactNode[] = [];

  if (d.clay || d.temp) {
    nodes.push(
      <div className="flex">
        {d.clay && (
          <div className={`flex-1 ${d.temp ? "pr-5" : ""}`}>
            <p className={LABEL_CLASS}>CLAY</p>
            <p className={`${VALUE_CLASS} mt-1`}>{d.clay}</p>
          </div>
        )}
        {d.clay && d.temp && (
          <div className={`border-l border-dashed ${DASH}`} />
        )}
        {d.temp && (
          <div className={`flex-1 ${d.clay ? "pl-5" : ""}`}>
            <p className={LABEL_CLASS}>TEMP</p>
            <p className={`${VALUE_CLASS} mt-1`}>{d.temp}</p>
          </div>
        )}
      </div>
    );
  }

  if (d.measurement) {
    nodes.push(
      <div>
        <p className={LABEL_CLASS}>MEASUREMENT</p>
        <p className={`${VALUE_CLASS} mt-1`}>{d.measurement}</p>
      </div>
    );
  }

  return nodes;
}

/**
 * Product INTERSTITIAL — a TICKET / boarding-pass card.
 *
 * The SAME ticket frame serves both product types: a cream card with rounded
 * top corners, half-circle notches on the left/right edges at the first
 * perforation, a scalloped (torn) bottom edge, dashed perforation dividers
 * between sections, and a couple of green corner sparkles. The TOP of every
 * ticket is the image carousel; below the first dashed divider is the
 * type-specific content; the bottom holds the action button(s). The card height
 * HUGS its content (auto) and grows/shrinks per step/product, capped by
 * `max-h-[92svh]` with internal scroll for very tall tickets.
 *
 *   · Darling babies → a single view: label + title + price + blurb, the
 *     reusable spec rows (only when data exists), and an "Add to cart" stub.
 *   · Ugly babies → the adoption FUNNEL (Q1 shared → Q2 → Q3 → price), each step
 *     rendered in ticket style and able to surface the same spec rows when the
 *     piece has spec data.
 *
 * The top-left circular X shows only when the current step has no explicit
 * close/quit pill (so never two exits at once); Esc + backdrop always close.
 */
export function ProductModal({
  product,
  collectionSlug,
  onClose,
}: {
  product: Product | null;
  collectionSlug: string | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [priceIdx, setPriceIdx] = useState<number | null>(null);
  const [checkoutNote, setCheckoutNote] = useState(false);
  const [cartNote, setCartNote] = useState(false);

  // Restart the funnel each time a new piece is opened.
  useEffect(() => {
    setStep(0);
    setPriceIdx(null);
    setCheckoutNote(false);
    setCartNote(false);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [product, onClose]);

  if (!product || !collectionSlug) return null;

  const isUgly = collectionSlug === "ugly-babies";
  const collectionLabel = (getCollection(collectionSlug)?.title ?? "").toUpperCase();
  const details = getProductDetails(product.slug);

  // De-duplicated photo set for the top carousel.
  const images = Array.from(
    new Set([product.defaultImage, ...product.detailImages])
  );

  // Ugly pieces with a funnel walk Q1→Q2→Q3→price; everything else (darling, or
  // an ugly piece missing a funnel) shows the single product view.
  const flow = isUgly ? getAdoptionFlow(product.slug) : undefined;
  const isFunnel = Boolean(flow);

  // Steps 0 (Q1) and 1 (Q2) carry their own "quit" pill, so the X is hidden
  // there to avoid two exits. Q3 / price / the darling view have no quit pill.
  const showQuitPill = isFunnel && (step === 0 || step === 1);
  const showX = !showQuitPill;

  const handleAdopt = () => {
    // TODO: Stripe checkout — create a Stripe Checkout session for this piece +
    // the selected price option (flow.prices[priceIdx]) and redirect. No-op for
    // now; we just surface a "coming soon" note.
    setCheckoutNote(true);
  };

  const handleAddToCart = () => {
    // TODO: cart/checkout — add this piece to the cart / start checkout. No-op
    // for now; we just surface a "coming soon" note.
    setCartNote(true);
  };

  const labelTitle = (
    <div>
      <p className={LABEL_CLASS}>{collectionLabel}</p>
      <h2 className={`${TITLE_CLASS} mt-1`}>{product.title}</h2>
    </div>
  );

  // Build the lower (below-carousel) ticket sections for the current view. Each
  // entry becomes its own section, separated by a dashed perforation divider.
  const sections: ReactNode[] = [];

  if (!isFunnel) {
    // ---- DARLING: single product view ----
    sections.push(
      <div>
        <p className={LABEL_CLASS}>{collectionLabel}</p>
        <h2 className={`${TITLE_CLASS} mt-1`}>{product.title}</h2>
        {product.isSold ? (
          <p className="mt-2 text-[18px] font-bold text-[#413E3F] line-through decoration-[#03F94D] decoration-[3px]">
            Sold
          </p>
        ) : product.price > 0 ? (
          <p className={`${VALUE_CLASS} mt-2`}>{priceLabel(product.price)}</p>
        ) : null}
        {details?.blurb && <p className={`${BODY_CLASS} mt-3`}>{details.blurb}</p>}
      </div>
    );
    sections.push(...specNodes(details));
    sections.push(
      <div>
        <button
          type="button"
          onClick={handleAddToCart}
          className={`${PILL_FILLED} w-full`}
        >
          Add to cart
        </button>
        {cartNote && (
          <p className="mt-3 text-center text-sm text-neutral-500">
            Cart coming soon.
          </p>
        )}
      </div>
    );
  } else if (step === 0) {
    // ---- UGLY Q1 (shared) ----
    sections.push(
      <div>
        {labelTitle}
        <p className={`${BODY_CLASS} mt-3`}>{SHARED_Q1.body}</p>
      </div>
    );
    sections.push(
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`${PILL_FILLED} w-full`}
        >
          {SHARED_Q1.advanceLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`${PILL_OUTLINE} w-full`}
        >
          {SHARED_Q1.closeLabel}
        </button>
      </div>
    );
  } else if (step === 1) {
    // ---- UGLY Q2 (per item) ----
    sections.push(
      <div>
        {labelTitle}
        <p className={`${BODY_CLASS} mt-3`}>{flow!.q2.body}</p>
      </div>
    );
    sections.push(...specNodes(details));
    sections.push(
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`${PILL_FILLED} w-full`}
        >
          {flow!.q2.advanceLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className={`${PILL_OUTLINE} w-full`}
        >
          {flow!.q2.quitLabel}
        </button>
      </div>
    );
  } else if (step === 2) {
    // ---- UGLY Q3 (per item) — BOTH buttons advance ----
    sections.push(
      <div>
        {labelTitle}
        <p className={`${BODY_CLASS} mt-3`}>{flow!.q3.body}</p>
      </div>
    );
    sections.push(...specNodes(details));
    sections.push(
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`${PILL_FILLED} w-full`}
        >
          {flow!.q3.leftLabel}
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`${PILL_OUTLINE} w-full`}
        >
          {flow!.q3.rightLabel}
        </button>
      </div>
    );
  } else {
    // ---- UGLY price step ----
    sections.push(labelTitle);
    sections.push(
      <div>
        <p className={BODY_CLASS}>Choose your adoption fee:</p>
        <div className="mt-4 flex flex-col gap-3">
          {flow!.prices.map((p, i) => {
            const selected = priceIdx === i;
            return (
              <button
                key={`${p.amount}-${i}`}
                type="button"
                aria-pressed={selected}
                onClick={() => setPriceIdx(i)}
                className={`flex h-12 w-full items-center justify-between gap-3 rounded-full border border-[#413E3F] px-5 font-[family-name:var(--font-figtree)] text-[15px] text-[#413E3F] transition-colors ${
                  selected ? "bg-[#03F94D]" : "bg-transparent hover:bg-[#03F94D]/30"
                }`}
              >
                <span className="font-semibold">${p.amount}</span>
                <span className="text-left">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
    sections.push(
      <div>
        <button
          type="button"
          onClick={handleAdopt}
          disabled={priceIdx === null}
          className={`${PILL_FILLED} w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#03F94D]`}
        >
          Adopt it!
        </button>
        {checkoutNote && (
          <p className="mt-3 text-center text-sm text-neutral-500">
            Checkout coming soon.
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-[family-name:var(--font-figtree)]"
    >
      {/* Backdrop — ink wash; clicking it closes the modal. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[#413E3F]/45 backdrop-blur-[2px]"
      />

      {/* The TICKET. Height hugs content (auto), capped + scrollable on small
          screens. The cream plane is punched into a ticket silhouette by
          `TICKET_MASK` (side notches + scalloped bottom). */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={TICKET_MASK}
        className="relative z-10 flex max-h-[92svh] w-full max-w-[460px] flex-col overflow-y-auto rounded-[20px] bg-[#FAF5ED] text-[#413E3F] shadow-2xl"
      >
        {/* Circular X — TOP-LEFT. Shown only when the current step has no quit
            pill; Esc + backdrop always close. */}
        {showX && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 left-4 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-[#FAF5ED]/80 transition-colors hover:bg-[#03F94D]"
          >
            <X className="size-5 text-[#413E3F]" />
          </button>
        )}

        {/* TOP — image carousel (rounded to match the card's top corners). */}
        <div className="overflow-hidden rounded-t-[20px]">
          <PhotoCarousel images={images} alt={product.title} />
        </div>

        {/* Lower content — sections separated by full-bleed dashed perforations
            (the first one carries the side notches). */}
        <div className="pb-8">
          {sections.map((node, i) => (
            <div key={i}>
              <div className={`border-t border-dashed ${DASH}`} />
              <div className="px-6 py-5">{node}</div>
            </div>
          ))}
        </div>

        {/* Decorative green sparkles near the bottom corners. */}
        <CornerSparkles />
      </div>
    </div>
  );
}
