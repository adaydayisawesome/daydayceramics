"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CREAM, INK } from "./constants";

type AboutInterstitialProps = {
  open: boolean;
  onClose: () => void;
};

const bodyClass =
  "font-[family-name:var(--font-figtree)] text-[18px] leading-[1.2] font-normal";

// NOTE: the written spec didn't mention italic for these headlines, but the
// design mockup shows "Darling Babies" / "Ugly Babies" in italic, so we render
// them italic to match the mockup.
const headlineClass =
  "font-[family-name:var(--font-playfair)] text-[36px] leading-none font-extrabold italic tracking-[-0.01em]";

export function AboutInterstitial({ open, onClose }: AboutInterstitialProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="About Day Day Ceramics"
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ backgroundColor: CREAM, color: INK }}
    >
      {/* Decorative "Creation of Adam" hands, broken apart and anchored to
          opposite corners to frame the text. Behind the content (z-0) and
          non-interactive so they never block the close button or links.
          Hidden below md so the single-column mobile text stays uncluttered. */}
      <Image
        src="/images/about/hand-top-right.webp"
        alt=""
        aria-hidden
        width={862}
        height={652}
        className="pointer-events-none absolute top-0 right-0 z-0 hidden h-auto w-[clamp(200px,26vw,420px)] select-none md:block"
        priority
      />
      <Image
        src="/images/about/hand-bottom-left.webp"
        alt=""
        aria-hidden
        width={898}
        height={587}
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-auto w-[clamp(200px,26vw,420px)] select-none md:block"
        priority
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Close"
        onClick={onClose}
        className="group absolute top-6 left-6 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent p-0 transition-colors hover:bg-[#413E3F]"
      >
        <X className="size-5 text-[#413E3F] transition-colors group-hover:text-[#F8F5EE]" />
      </Button>

      {/* Vertically centered block; generous top padding clears the close button.
          Horizontal rhythm mimics the home page DAY letters: a centered max-width
          track with a 98px column gutter (matches day-letters' md:gap-[98px]). */}
      <div className="relative z-10 flex min-h-full items-center justify-center px-6 py-24 md:px-[140px]">
        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-12 md:grid-cols-3 md:gap-[98px]">
          {/* Column 1 — body only, no headline, starts at the top. */}
          <div>
            <p className={bodyClass}>
              Hi, I&apos;m <strong className="font-bold">Huilin</strong>, a
              designer and ceramic artist exploring pottery through use, touch,
              and everyday ritual.
            </p>
            <p className={`${bodyClass} mt-4`}>
              My work often begins with objects meant to be held—things that
              live close to the body. Coming from a design background, I care
              deeply about function, proportion, and the experience of use; but
              I am also drawn to clay&apos;s wonky, accidental, and emotionally
              specific nature.
            </p>
            <p className={`${bodyClass} mt-4`}>
              Once in a while, I also make non-functional pieces as a way to
              play, wander, and let ideas loosen up. For me, clay is both a
              material for making useful objects and a place for curiosity,
              failure, and small discoveries.
            </p>

            <div className="mt-8 flex items-center gap-4">
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

              {/* TODO: email destination is TBD — placeholder href for now. */}
              <a
                href="#"
                aria-label="Email"
                className="inline-flex cursor-pointer text-[#413E3F] transition-opacity hover:opacity-70"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2 — lead line, then headline, then body. */}
          <div>
            <p className={bodyClass}>
              I divide my pieces into two little families:
            </p>
            <h2 className={`${headlineClass} mt-6`}>Darling Babies</h2>
            <p className={`${bodyClass} mt-4`}>
              Polished, well-loved, thoughtful, and somehow survived my picky
              heart.
            </p>
            <p className={`${bodyClass} mt-4`}>
              These are the pieces I feel proud to send out into the world. They
              are functional, carefully finished, and meet my current standards
              in form, glaze, and usability.
            </p>
            {/* Extra blank line of space before the CTA, then "View all" →. */}
            <Link
              href="/collections/darling-babies"
              className={`${bodyClass} group mt-10 inline-flex items-center gap-2 text-[#413E3F] no-underline transition-opacity hover:opacity-70`}
            >
              View all
              <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Column 3 — no lead line. An invisible copy of column 2's lead line
              reserves the same vertical space so "Ugly Babies" lines up with
              "Darling Babies". Columns are equal width, so it wraps identically. */}
          <div>
            <p className={`${bodyClass} invisible`} aria-hidden>
              I divide my pieces into two little families:
            </p>
            <h2 className={`${headlineClass} mt-6`}>Ugly Babies</h2>
            <p className={`${bodyClass} mt-4`}>
              Early, odd, imperfect, and somehow still lovable.
            </p>
            <p className={`${bodyClass} mt-4`}>
              These are pieces from my earlier learning stages, experiments, or
              works that did not turn out exactly as planned but still have
              something interesting, charming, or usable about them. They may be
              a little wonky, a little weird, or a little defeated, but they are
              honest little things.
            </p>
            {/* Extra blank line of space before the CTA, then "View all" →. */}
            <Link
              href="/collections/ugly-babies"
              className={`${bodyClass} group mt-10 inline-flex items-center gap-2 text-[#413E3F] no-underline transition-opacity hover:opacity-70`}
            >
              View all
              <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
