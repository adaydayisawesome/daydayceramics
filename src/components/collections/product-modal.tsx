"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Sparkle } from "@/components/icons/sparkle";
import { getAdoptionFlow } from "@/lib/adoptions";
import type { Product } from "@/lib/products";
import { getCollection, priceLabel } from "@/lib/products";
import { DetailMedia } from "./detail-media";
import { PhotoCarousel } from "./photo-carousel";

const MARKER_GREEN = "#03F94D";
const INK = "#413E3F";

// Body copy sizing/family lifted verbatim from About (`bodyClass` in
// `about-content.tsx`) so every question reads at the same scale.
const BODY_CLASS =
  "font-[family-name:var(--font-figtree)] text-[18px] leading-[1.4] font-normal";

// Primary-action pills — same visual language as the VIEW GALLERY / Adopt pills
// (rounded-full, ink border, Figtree, ink text), sized up a touch since these
// are the dialog's main actions.
const PILL_BASE =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] px-6 font-[family-name:var(--font-figtree)] text-[15px] font-semibold tracking-wide text-[#413E3F] whitespace-nowrap transition-colors";
// Primary (left): filled neon-green by default, a touch darker on hover.
const PILL_FILLED = `${PILL_BASE} bg-[#03F94D] hover:bg-[#02D944]`;
// Secondary (right): outline, fills green on hover.
const PILL_OUTLINE = `${PILL_BASE} bg-transparent hover:bg-[#03F94D]`;

// Shared content wrappers for the content-hugging question / price steps.
const STEP_WRAP =
  "relative z-10 flex flex-col items-center overflow-y-auto px-6 py-14 text-center sm:px-10";
const STEP_INNER = "flex w-full max-w-[520px] flex-col items-center";
const BTN_ROW =
  "mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4";

// Q1 — the SHARED ugly-babies gate question (same for every ugly piece). The
// per-item Q2/Q3/price copy lives in `src/lib/adoptions.ts`.
const SHARED_Q1 = {
  body: (
    <>
      This baby has been labeled Ugly for documented reasons.
      <br />
      It may be early, odd, or imperfect — but it survived the kiln, my judgment,
      and the general cruelty of taste.
      <br />
      Would you like to meet it properly?
    </>
  ),
  advanceLabel: "Show me the damage",
  closeLabel: "I'm not emotionally ready",
};

// Decorative star scatter shown on EVERY modal view. Positions hug the panel
// edges/corners so they frame (never obscure) the content. Rendered behind the
// content (z-0) and clipped by the panel's `overflow-hidden`, so they never add
// scrollbars or shift layout.
const STAR_SCATTER: {
  style: React.CSSProperties;
  size: number;
  delay: number;
  rotate: number;
}[] = [
  { style: { top: "7%", left: "7%" }, size: 26, delay: 0, rotate: -12 },
  { style: { top: "5%", left: "34%" }, size: 16, delay: 0.9, rotate: 10 },
  { style: { top: "9%", right: "9%" }, size: 30, delay: 0.4, rotate: 8 },
  { style: { top: "26%", right: "21%" }, size: 14, delay: 1.4, rotate: -6 },
  { style: { top: "42%", left: "4%" }, size: 20, delay: 0.6, rotate: 14 },
  { style: { top: "46%", right: "5%" }, size: 18, delay: 1.1, rotate: -10 },
  { style: { bottom: "11%", left: "9%" }, size: 24, delay: 0.2, rotate: 6 },
  { style: { bottom: "6%", left: "43%" }, size: 16, delay: 1.6, rotate: -14 },
  { style: { bottom: "12%", right: "10%" }, size: 28, delay: 0.8, rotate: 12 },
];

function StarScatter() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 select-none"
    >
      {STAR_SCATTER.map((s, i) => (
        <span
          key={i}
          className="absolute"
          style={{ ...s.style, transform: `rotate(${s.rotate}deg)` }}
        >
          <span
            className="sparkle-twinkle block"
            style={{ animationDelay: `${s.delay}s` }}
          >
            <Sparkle size={s.size} color={MARKER_GREEN} />
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Product INTERSTITIAL — the state-driven replacement for the old
 * `/collections/[collection]/[product]` detail route (now removed).
 *
 * Darling-babies pieces open straight to the detail content (matted hero +
 * gallery via `DetailMedia` — note: NO 360 spin in the modal; the spin lives on
 * the listing grid).
 *
 * Ugly-babies pieces run an ADOPTION FUNNEL (a STEP SEQUENCE) before the detail:
 *   step 0 → Q1 (shared question)
 *   step 1 → Q2 (per-item, with a photo carousel)
 *   step 2 → Q3 (per-item; both buttons advance)
 *   step 3 → price step (single-select + "Adopt it!")
 *   step ≥ 4 → the piece detail view
 * Per-item copy/prices come from `getAdoptionFlow(product.slug)`; a piece with
 * no flow (every darling piece) shows the detail immediately.
 *
 * Closes on a backdrop click or Escape at any step. The top-left circular `X`
 * is shown only when the CURRENT step has no explicit close/quit pill (i.e. on
 * Q3, the price step, and the detail view) — never two exits at once. Body
 * scroll is locked while open. Visual language: cream `#FAF5ED`, ink `#413E3F`,
 * neon-green accents, and a scattered green sparkle layer behind every view.
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

  // Restart the funnel each time a new piece is opened.
  useEffect(() => {
    setStep(0);
    setPriceIdx(null);
    setCheckoutNote(false);
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
  const collectionTitle = getCollection(collectionSlug)?.title ?? "";

  // Ugly pieces with a funnel walk Q1→Q2→Q3→price→detail; everything else
  // (darling, or any ugly piece missing a funnel) opens straight to detail.
  const flow = isUgly ? getAdoptionFlow(product.slug) : undefined;
  const showDetail = !flow || step >= 4;

  // Steps 0 (Q1) and 1 (Q2) carry their own "quit" pill, so the X is hidden
  // there to avoid two exits. Q3 / price / detail have no quit pill → show X.
  const showQuitPill = Boolean(flow) && (step === 0 || step === 1);
  const showX = !showQuitPill;

  const handleAdopt = () => {
    // TODO: Stripe checkout — create a Stripe Checkout session for this piece +
    // the selected price option (flow.prices[priceIdx]) and redirect. No-op for
    // now; we just surface a "coming soon" note.
    setCheckoutNote(true);
  };

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

      {/* Panel — cream plane. Clicks inside don't bubble to the backdrop.
          Question/price steps hug their content (compact ~600px); the detail
          step keeps the roomy panel the gallery needs. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 flex max-h-[92svh] w-full flex-col overflow-hidden rounded-[20px] bg-[#FAF5ED] text-[#413E3F] shadow-2xl ${
          showDetail ? "max-w-3xl" : "max-w-[600px]"
        }`}
      >
        {/* Decorative scattered green stars — behind the content on every view. */}
        <StarScatter />

        {/* Circular X — TOP-LEFT. Shown only when the current step has no
            explicit quit pill (Q3 / price / detail); Esc + backdrop always
            close. */}
        {showX && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 left-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-[#FAF5ED]/80 transition-colors hover:bg-[#03F94D]"
          >
            <X className="size-5 text-[#413E3F]" />
          </button>
        )}

        {showDetail ? (
          /* DETAIL VIEW — static media + gallery (no 360 spin). */
          <div className="relative z-10 overflow-y-auto p-6 md:p-10">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
              <DetailMedia
                title={product.title}
                defaultImage={product.defaultImage}
                detailImages={product.detailImages}
                detailVideos={product.detailVideos}
                isSold={product.isSold}
              />

              <div className="flex w-full flex-col items-start text-left md:flex-1 md:pt-4">
                <p className="text-sm tracking-[0.02em] text-neutral-500">
                  {collectionTitle}
                </p>
                <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold">
                  {product.title}
                </h2>

                {/* Price / status — mirrors the grid cell treatment:
                    · sold pieces: "Sold" with a neon-green strike
                    · ugly babies: an "Adopt this baby" pill (no price)
                    · everything else: the price */}
                <div className="mt-4">
                  {product.isSold ? (
                    <span className="text-lg font-semibold text-[#413E3F] line-through decoration-[#03F94D] decoration-[3px]">
                      Sold
                    </span>
                  ) : isUgly ? (
                    <button
                      type="button"
                      className="inline-flex h-9 cursor-pointer items-center rounded-full border border-[#413E3F] bg-transparent px-4 text-[13px] font-semibold tracking-wide text-[#413E3F] transition-colors hover:bg-[#03F94D]"
                    >
                      Adopt this baby
                    </button>
                  ) : (
                    <span className="text-lg text-neutral-700">
                      {priceLabel(product.price)}
                    </span>
                  )}
                </div>

                <p className="mt-8 max-w-sm text-sm leading-relaxed text-neutral-500">
                  Checkout will connect to Shopify here later.
                </p>
              </div>
            </div>
          </div>
        ) : step === 0 ? (
          /* STEP 0 — shared Q1. */
          <div className={STEP_WRAP}>
            <div className={STEP_INNER}>
              <p className={BODY_CLASS} style={{ color: INK }}>
                {SHARED_Q1.body}
              </p>
              <div className={BTN_ROW}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`${PILL_FILLED} w-full sm:w-auto`}
                >
                  {SHARED_Q1.advanceLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${PILL_OUTLINE} w-full sm:w-auto`}
                >
                  {SHARED_Q1.closeLabel}
                </button>
              </div>
            </div>
          </div>
        ) : step === 1 ? (
          /* STEP 1 — per-item Q2, with the photo carousel. */
          <div className={STEP_WRAP}>
            <div className={STEP_INNER}>
              <p className={BODY_CLASS} style={{ color: INK }}>
                {flow!.q2.body}
              </p>
              <div className="mt-7 w-full">
                <PhotoCarousel
                  images={product.detailImages}
                  alt={product.title}
                />
              </div>
              <div className={BTN_ROW}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`${PILL_FILLED} w-full sm:w-auto`}
                >
                  {flow!.q2.advanceLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${PILL_OUTLINE} w-full sm:w-auto`}
                >
                  {flow!.q2.quitLabel}
                </button>
              </div>
            </div>
          </div>
        ) : step === 2 ? (
          /* STEP 2 — per-item Q3; BOTH buttons advance to the price step. */
          <div className={STEP_WRAP}>
            <div className={STEP_INNER}>
              <p className={BODY_CLASS} style={{ color: INK }}>
                {flow!.q3.body}
              </p>
              <div className={BTN_ROW}>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`${PILL_FILLED} w-full sm:w-auto`}
                >
                  {flow!.q3.leftLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className={`${PILL_OUTLINE} w-full sm:w-auto`}
                >
                  {flow!.q3.rightLabel}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 3 — price step: single-select of 3 options + "Adopt it!". */
          <div className={STEP_WRAP}>
            <div className={STEP_INNER}>
              <p className={BODY_CLASS} style={{ color: INK }}>
                Choose your adoption fee:
              </p>

              <div className="mt-7 flex w-full flex-col gap-3">
                {flow!.prices.map((p, i) => {
                  const selected = priceIdx === i;
                  return (
                    <button
                      key={`${p.amount}-${i}`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPriceIdx(i)}
                      className={`flex h-12 w-full items-center justify-between gap-3 rounded-full border border-[#413E3F] px-5 font-[family-name:var(--font-figtree)] text-[15px] text-[#413E3F] transition-colors ${
                        selected
                          ? "bg-[#03F94D]"
                          : "bg-transparent hover:bg-[#03F94D]/30"
                      }`}
                    >
                      <span className="font-semibold">${p.amount}</span>
                      <span className="text-left">{p.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAdopt}
                disabled={priceIdx === null}
                className={`${PILL_FILLED} mt-8 w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#03F94D]`}
              >
                Adopt it!
              </button>

              {checkoutNote && (
                <p className="mt-4 text-sm text-neutral-500">
                  Checkout coming soon.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
