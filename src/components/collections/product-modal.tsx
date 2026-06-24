"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Sparkle } from "@/components/icons/sparkle";
import type { Product } from "@/lib/products";
import { getCollection, priceLabel } from "@/lib/products";
import { DetailMedia } from "./detail-media";

const MARKER_GREEN = "#03F94D";
const INK = "#413E3F";

// Body copy sizing/family lifted verbatim from About (`bodyClass` in
// `about-content.tsx`) so the questionnaire reads at the same scale.
const BODY_CLASS =
  "font-[family-name:var(--font-figtree)] text-[18px] leading-[1.4] font-normal";

// Primary-action pill — same visual language as the VIEW GALLERY / Adopt pills
// (rounded-full, ink border, Figtree, ink text, neon-green hover), sized up a
// touch since these are the dialog's main actions.
const PILL_CLASS =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent px-6 font-[family-name:var(--font-figtree)] text-[15px] font-semibold tracking-wide text-[#413E3F] whitespace-nowrap transition-colors hover:bg-[#03F94D]";

/**
 * An ugly-babies gate question. The modal walks through `UGLY_QUESTIONS` in
 * order (a STEP SEQUENCE) before revealing the actual piece detail, so more
 * questions can be added later just by appending to this array — no other
 * wiring needed. Each question's primary button advances to the next step
 * (the last one lands on the piece detail); the secondary button closes.
 */
const UGLY_QUESTIONS: {
  body: React.ReactNode;
  advanceLabel: string;
  closeLabel: string;
}[] = [
  {
    body: (
      <>
        This baby has been labeled Ugly for documented reasons.
        <br />
        It may be early, odd, or imperfect — but it survived the kiln, my
        judgment, and the general cruelty of taste.
        <br />
        Would you like to meet it properly?
      </>
    ),
    advanceLabel: "Show me the damage",
    closeLabel: "I'm not emotionally ready",
  },
];

// Decorative star scatter for the questionnaire step. Positions hug the panel
// edges/corners so they frame (never obscure) the centered copy. Clipped by the
// panel's `overflow-hidden`, so they never add scrollbars or shift layout.
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
 * Darling-babies pieces open straight to the detail content (matted hero / 360°
 * spin via `DetailMedia`, the gallery, videos, title + price).
 *
 * Ugly-babies pieces are GATED behind a step sequence: the modal first walks
 * through `UGLY_QUESTIONS` (one question for now) and only reveals the piece
 * detail on the final advance. `step` indexes into the questions; once
 * `step >= UGLY_QUESTIONS.length` (always true for darling, whose question list
 * is empty) the detail view renders. Adding a question later is just a matter
 * of appending to `UGLY_QUESTIONS`.
 *
 * Closes on the X button (any step), a backdrop click, or Escape. Body scroll
 * is locked while open. Visual language matches the site: cream `#FAF5ED`, ink
 * `#413E3F`, a circular top-left `X`, and neon-green accents.
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

  // Restart the sequence each time a new piece is opened.
  useEffect(() => {
    setStep(0);
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

  // Ugly pieces have a questions list; darling pieces don't (empty), so they
  // fall straight through to the detail view.
  const questions = isUgly ? UGLY_QUESTIONS : [];
  const showQuestion = step < questions.length;
  const question = questions[step];

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

      {/* Panel — cream plane. Clicks inside don't bubble to the backdrop. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] bg-[#FAF5ED] text-[#413E3F] shadow-2xl"
      >
        {/* Circular X — TOP-LEFT, matching the site's left-aligned close/X
            convention (home grid header, /bag, etc.). Closes at ANY step. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 left-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-[#FAF5ED]/80 transition-colors hover:bg-[#03F94D]"
        >
          <X className="size-5 text-[#413E3F]" />
        </button>

        {showQuestion ? (
          /* STEP: ugly-babies gate question. */
          <div className="relative flex min-h-[68svh] flex-col items-center justify-center overflow-y-auto px-6 py-16 text-center sm:px-10">
            {/* Decorative scattered green stars (questionnaire step only). */}
            <StarScatter />

            <div className="relative z-10 flex w-full max-w-[520px] flex-col items-center">
              <p className={BODY_CLASS} style={{ color: INK }}>
                {question.body}
              </p>

              <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className={`${PILL_CLASS} w-full sm:w-auto`}
                >
                  {question.advanceLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${PILL_CLASS} w-full sm:w-auto`}
                >
                  {question.closeLabel}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FINAL STEP: the existing piece detail view. */
          <div className="overflow-y-auto p-6 md:p-10">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
              <DetailMedia
                title={product.title}
                defaultImage={product.defaultImage}
                detailImages={product.detailImages}
                detailVideos={product.detailVideos}
                spinMedia={product.spinMedia}
                hoverType={product.hoverType}
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
        )}
      </div>
    </div>
  );
}
