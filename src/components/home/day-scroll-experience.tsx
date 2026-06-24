"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Sparkle } from "@/components/icons/sparkle";
import { AboutContent } from "./about-content";
import { CREAM, D_SPIN_ASSET, INK, SPIN_ASSET } from "./constants";
import { DayPageHeader } from "./day-page-header";
import { AutoSpinCell, useSharedSpinTick } from "./sprite-cell";

const GRID_COLS = 6;
const GRID_ROWS = 3;
const GRID_CELLS = GRID_COLS * GRID_ROWS; // 18

const DAY_OUTLINE = "/images/home-v2/day-outline.webp";
const DAY_FILL_MARKER = "/images/home-v2/day-fill-marker.webp";

// Scroll choreography, expressed in viewport heights.
//   *_TRACK_VH : total scroll length of each pinned stage's track.
//   The pinned stage is sticky for (TRACK - 1) screens of scroll.
//   *_FRACTION : the fraction of the pin range over which the effect (DAY fill
//                / hand separation) runs to 100%. The remaining range is a
//                short "dwell" — scrolling into it auto-advances to the next
//                section (a JS-driven snap).
const DAY_TRACK_VH = 2;
const Y_TRACK_VH = 2;
const FILL_FRACTION = 0.62;
const SEP_FRACTION = 0.62;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

const MARKER_GREEN = "#03F94D";

// A few sparkles that come OUT of the kiln (screen center) as you scroll and
// ease out to scattered resting spots along the sides of the two hands, where
// they settle (and stay) framing the About content.
//   tx/ty : resting offset from center, in vw/vh
//   delay : stagger along `sep`           · size : px · rot : settle rotation
type Spark = {
  tx: number;
  ty: number;
  size: number;
  rot: number;
  delay: number;
};
const SPARKS: Spark[] = [
  { tx: 43, ty: -41, size: 24, rot: -10, delay: 0.02 },
  { tx: 31, ty: -26, size: 15, rot: 20, delay: 0.12 },
  { tx: 45, ty: -17, size: 18, rot: 8, delay: 0.2 },
  { tx: -43, ty: 39, size: 24, rot: 12, delay: 0.06 },
  { tx: -33, ty: 25, size: 15, rot: -18, delay: 0.16 },
  { tx: -45, ty: 16, size: 18, rot: 6, delay: 0.24 },
];

/**
 * The site's main DAY experience (`/day`, version 2): a scroll-snap journey
 * with just TWO full-height stages in the document scroll.
 *
 *  1. DAY        — the halftone spinning-objects grid behind a hand-drawn
 *                  "DAY". Scrolling (OR hovering) fills the outline with the
 *                  neon-green marker 0→100%. Once full, continued scroll — or a
 *                  CLICK on the DAY — smooth-scrolls to the Y / About stage.
 *  2. Y / About  — the two "Creation of Adam" hands start attached, their
 *                  fingertips nearly touching at the center of a thin circle.
 *                  Scrolling separates them out toward the corners 0→100%, and
 *                  the SAME progress fades + slides the About content (bio +
 *                  Shipping & Returns) up into view, so the story appears the
 *                  moment the hands begin to part — no empty "separated" page.
 *                  The separating hands double as the corner-framing hands, so
 *                  `AboutContent` is rendered with `showHands={false}`.
 *
 * Replaces the old full-screen About modal for this flow (V1 still uses it).
 */
export function DayScrollExperience() {
  const tick = useSharedSpinTick(12);
  const [fill, setFill] = useState(0); // scroll-driven DAY fill, 0..1
  const [sep, setSep] = useState(0); // scroll-driven hand separation, 0..1
  const [hovered, setHovered] = useState(false);

  const dayTrackRef = useRef<HTMLElement>(null);
  const yTrackRef = useRef<HTMLElement>(null);
  const advancingRef = useRef(false);
  const lastYRef = useRef(0);
  const autoAboutFired = useRef(false);
  const idleTimerRef = useRef<number | undefined>(undefined);

  // Cursor parallax for the two hands (applied via refs in a rAF loop so it
  // never triggers React re-renders / disturbs the scroll animation).
  const topHandRef = useRef<HTMLDivElement>(null);
  const botHandRef = useRef<HTMLDivElement>(null);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCur = useRef({ x: 0, y: 0 });

  // Keep the page background CREAM (V1's hover effect may have left it INK).
  useEffect(() => {
    document.documentElement.style.backgroundColor = CREAM;
    document.body.style.backgroundColor = CREAM;
  }, []);

  // Cursor parallax: the two hands gently drift toward the cursor (the lower
  // hand a touch more, for depth), easing back to rest when it leaves. Honors
  // reduced-motion. Pure DOM writes — no re-render.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      pointerTarget.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerTarget.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onLeave = () => {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onLeave);

    const TOP = 18; // px max drift, upper-right hand
    const BOT = 28; // px max drift, lower-left hand (more = nearer)
    let raf = requestAnimationFrame(function loop() {
      const c = pointerCur.current;
      const t = pointerTarget.current;
      c.x += (t.x - c.x) * 0.08;
      c.y += (t.y - c.y) * 0.08;
      if (topHandRef.current) {
        topHandRef.current.style.transform = `translate3d(${c.x * TOP}px, ${c.y * TOP}px, 0)`;
      }
      if (botHandRef.current) {
        botHandRef.current.style.transform = `translate3d(${c.x * BOT}px, ${c.y * BOT}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const smoothScrollTo = useCallback((top: number) => {
    advancingRef.current = true;
    window.scrollTo({ top, behavior: "smooth" });
    // Release the guard after the smooth scroll settles so the next manual
    // scroll can trigger the following snap.
    window.setTimeout(() => {
      advancingRef.current = false;
    }, 750);
  }, []);

  // A duration-controlled glide (easeInOutQuad) so the auto-advance plays the
  // Y/About animation at an enjoyable pace rather than an abrupt native jump.
  const animateScrollTo = useCallback((top: number, duration: number) => {
    advancingRef.current = true;
    const start = window.scrollY;
    const dist = top - start;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      window.scrollTo(0, start + dist * ease);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        advancingRef.current = false;
      }
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vh = window.innerHeight;
        const y = window.scrollY;
        const goingDown = y > lastYRef.current;
        lastYRef.current = y;

        const dayTop = dayTrackRef.current?.offsetTop ?? 0;
        const yTop = yTrackRef.current?.offsetTop ?? vh * DAY_TRACK_VH;

        const dayFillDist = Math.max(1, (DAY_TRACK_VH - 1) * vh * FILL_FRACTION);
        const f = clamp((y - dayTop) / dayFillDist, 0, 1);
        setFill(f);

        const sepDist = Math.max(1, (Y_TRACK_VH - 1) * vh * SEP_FRACTION);
        const s = clamp((y - yTop) / sepDist, 0, 1);
        setSep(s);

        // Auto-advance: once the user lands at the START of the Y/About stage
        // (kiln centered between the hands) and STOPS scrolling, glide the rest
        // of the way so the hands part, the kiln drops, the sparkles fly, and
        // the story settles — no need to keep scrolling manually. Re-arms when
        // the user goes back up into the DAY stage.
        if (y < yTop - vh * 0.3) autoAboutFired.current = false;
        window.clearTimeout(idleTimerRef.current);
        if (!autoAboutFired.current && y >= yTop - vh * 0.15 && s < 0.2) {
          const yEnd = yTop + (Y_TRACK_VH - 1) * vh;
          idleTimerRef.current = window.setTimeout(() => {
            if (autoAboutFired.current) return;
            const yy = window.scrollY;
            if (yy >= yTop - vh * 0.2 && yy < yTop + sepDist * 0.5) {
              autoAboutFired.current = true;
              animateScrollTo(yEnd, 1800);
            }
          }, 650);
        }

        if (advancingRef.current || !goingDown) return;

        // DAY full + scrolled a touch past full, still before Y → snap to Y.
        // (No second snap: the About content reveals in-place as the hands part,
        // so there's no separate page to jump to.)
        if (
          f >= 1 &&
          y < yTop - 4 &&
          y - dayTop > dayFillDist + vh * 0.05
        ) {
          smoothScrollTo(yTop);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(idleTimerRef.current);
    };
  }, [smoothScrollTo, animateScrollTo]);

  // The DAY marker is FILLED BY DEFAULT: the resting state shows the brushed
  // neon-green marker fill (matching the old hover look) the instant the page
  // loads. Scroll (`fill`) and hover (`hovered`) still feed the snap/choreo
  // logic below, but the marker stays fully painted regardless — so the
  // scroll-to-fill animation is now effectively redundant, as intended.
  const RESTING_FILL = 1;
  const effectiveFill = Math.max(fill, hovered ? 1 : 0, RESTING_FILL);

  // About text reveal: driven by the SAME separation progress as the hands so
  // the story fades + slides up the instant the hands begin to part (no empty
  // "separated, no text" page). Completes by the time the hands are halfway out.
  const reveal = clamp(sep / 0.5, 0, 1);

  const goToY = useCallback(() => {
    const yTop =
      yTrackRef.current?.offsetTop ?? window.innerHeight * DAY_TRACK_VH;
    smoothScrollTo(yTop);
  }, [smoothScrollTo]);

  return (
    <div className="relative w-full" style={{ backgroundColor: CREAM, color: INK }}>
      <DayPageHeader />

      {/* STAGE 1 — DAY. Sticky stage pinned across the track. */}
      <section
        ref={dayTrackRef}
        className="relative w-full"
        style={{ height: `${DAY_TRACK_VH * 100}svh` }}
      >
        <div className="sticky top-0 flex h-[100svh] w-full items-center justify-center overflow-hidden">
          {/* Halftone spin grid — desktop 6×3, mobile (portrait) 3×6. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 grid grid-cols-3 grid-rows-6 opacity-55 md:grid-cols-6 md:grid-rows-3"
          >
            {Array.from({ length: GRID_CELLS }, (_, i) => {
              const row = Math.floor(i / GRID_COLS);
              const useD = (i + row) % 2 === 0;
              const phase = (i * 5) % 24;
              return (
                <div key={i} className="flex items-center justify-center">
                  <AutoSpinCell
                    name={useD ? D_SPIN_ASSET : SPIN_ASSET}
                    frame={tick + phase}
                    print
                    grayscale
                    className="h-auto w-[clamp(96px,28vw,190px)] md:w-[clamp(56px,11vw,150px)]"
                  />
                </div>
              );
            })}
          </div>

          {/* DAY + tagline. Click smooth-scrolls to Y; hover + scroll fill the
              marker. The tagline matches the DAY's width (inset ~18px each side)
              and reuses the policy-headline type. */}
          <div className="relative z-10 flex flex-col items-center">
            <button
              type="button"
              onClick={goToY}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              aria-label="Read the Day Day Ceramics story"
              className="group relative block w-[min(86vw,960px)] cursor-pointer border-0 bg-transparent p-0"
              style={{ aspectRatio: "1400 / 950" }}
            >
              {/* Neon-green marker fill — opacity tracks the fill progress. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DAY_FILL_MARKER}
                alt=""
                aria-hidden
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain select-none transition-opacity duration-200 ease-out"
                style={{ opacity: effectiveFill }}
              />
              {/* Dark outline — always on top so the strokes stay crisp. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DAY_OUTLINE}
                alt="DAY"
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain opacity-100 select-none"
              />
            </button>

            {/* Tagline — width capped to the DAY, 18px inset each side, with a
                hand-drawn circle around "adoption agency". */}
            <p
              className="text-center font-[family-name:var(--font-figtree)] text-[20px] leading-snug font-bold text-[#413E3F]"
              style={{
                width: "min(86vw, 960px)",
                paddingLeft: 18,
                paddingRight: 18,
                // The DAY artwork carries ~17.8% transparent space below the
                // glyphs (≈0.1207 × box width). Cancel it and leave a real ~30px
                // gap; scales with the DAY at every breakpoint.
                marginTop: "calc(30px - 0.1207 * min(86vw, 960px))",
              }}
            >
              A tiny{" "}
              <span className="relative inline-block">
                {/* Neon-green brush/highlighter swipe behind the words. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/home-v2/marker-highlight.webp"
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="pointer-events-none absolute top-1/2 left-1/2 z-0 h-[150%] w-[114%] -translate-x-1/2 -translate-y-1/2 select-none"
                  style={{ objectFit: "fill" }}
                />
                <span className="relative z-10">adoption agency</span>
              </span>{" "}
              for handmade ceramic babies
            </p>
          </div>

          {/* Scroll-hint: a down arrow (same size/style as the circular icons)
              with a subtle continuous downward nudge. Fades out as the DAY
              fills so it doesn't linger over the green. Clicking it advances to
              the story. */}
          <button
            type="button"
            onClick={goToY}
            aria-label="Scroll to the story"
            className="absolute bottom-8 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-[#413E3F] bg-transparent transition-colors hover:bg-[#03F94D]"
            style={{
              opacity: clamp(1 - fill * 1.2, 0, 1),
              pointerEvents: fill > 0.9 ? "none" : "auto",
            }}
          >
            <ChevronDown className="scroll-nudge size-5 text-[#413E3F]" />
          </button>
        </div>
      </section>

      {/* STAGE 2 — Y / About. Hands start with fingertips nearly touching at
          center, separate toward the corners, and the About content reveals on
          the same progress (no separate empty page). */}
      <section
        ref={yTrackRef}
        id="about"
        className="relative w-full"
        style={{ height: `${Y_TRACK_VH * 100}svh` }}
      >
        <div className="sticky top-0 h-[100svh] w-full">
          {/* Decorative layer (circle + hands), clipped to the viewport so the
              hands can travel off-screen into the corners. */}
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            {/* Thin circle behind the hands; fades out as they separate. */}
            <div
              className="pointer-events-none absolute rounded-full border-2"
              style={{
                left: "50%",
                top: "50%",
                width: "min(64vmin, 560px)",
                height: "min(64vmin, 560px)",
                transform: "translate(-50%, -50%)",
                borderColor: MARKER_GREEN,
                opacity: clamp(1 - sep * 1.4, 0, 1),
              }}
            />

            {/* Kiln CENTERED in the circle between the two pointing fingertips,
                slightly tilted. As the hands part it DROPS toward the bottom and
                fades out while the sparkles burst from it, leaving the cleared
                center to the text. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/about/kiln.webp"
              alt=""
              draggable={false}
              className="pointer-events-none absolute h-auto w-[clamp(110px,20vmin,240px)] select-none"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(-50%, calc(-50% + ${sep * 60}vh)) rotate(-4deg)`,
                opacity: clamp(1 - sep * 2.4, 0, 1),
              }}
            />

            {/* Upper / right hand ("God"): arm enters from the upper-right; its
                pointing index fingertip is the asset's LEFTMOST opaque pixel at
                ~(5.7%, 66.9%). The base translate lands that fingertip a hair
                LEFT of center, at the circle's vertical midline, so it nearly
                meets the other hand's tip (Creation-of-Adam pose). Because the
                touch point is this hand's extreme edge, none of the hand crosses
                past center — no palm overlap. Separation then drives it out to
                the top-right corner. */}
            <div
              ref={topHandRef}
              className="pointer-events-none absolute inset-0 will-change-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/about/hand-top-right.webp"
                alt=""
                draggable={false}
                className="pointer-events-none absolute h-auto w-[clamp(180px,40vmin,460px)] select-none"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(28% + ${sep * 18}vw), calc(-64% - ${sep * 12}vh))`,
                  maskImage:
                    "linear-gradient(to right, #000 58%, transparent 92%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, #000 58%, transparent 92%)",
                }}
              />
            </div>

            {/* Lower / left hand ("Adam"): arm enters from the lower-left; its
                reaching fingertip is the asset's RIGHTMOST opaque pixel at
                ~(94.2%, 26.2%). The base translate lands that fingertip a hair
                RIGHT of center, at the circle's vertical midline, leaving a
                hair's gap from the other hand's tip. Being this hand's extreme
                edge, nothing crosses past center — no palm overlap. Separation
                then drives it out to the bottom-left corner. */}
            <div
              ref={botHandRef}
              className="pointer-events-none absolute inset-0 will-change-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/about/hand-bottom-left.webp"
                alt=""
                draggable={false}
                className="pointer-events-none absolute h-auto w-[clamp(180px,40vmin,460px)] select-none"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-123% - ${sep * 18}vw), calc(-41% + ${sep * 12}vh))`,
                  maskImage:
                    "linear-gradient(to left, #000 58%, transparent 92%)",
                  WebkitMaskImage:
                    "linear-gradient(to left, #000 58%, transparent 92%)",
                }}
              />
            </div>

            {/* Sparkles emerge from the kiln (center) and ease out to scattered
                resting spots beside the hands as you scroll, then settle. */}
            {SPARKS.map((st, i) => {
              const p = clamp((sep - st.delay) * 1.6, 0, 1);
              const e = 1 - (1 - p) * (1 - p); // easeOut travel
              return (
                <div
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute"
                  style={{
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) translate(${st.tx * e}vw, ${st.ty * e}vh) rotate(${st.rot * p}deg) scale(${0.3 + 0.7 * p})`,
                    opacity: clamp(p * 3, 0, 1),
                  }}
                >
                  <Sparkle size={st.size} color={MARKER_GREEN} />
                </div>
              );
            })}
          </div>

          {/* About content overlay: fades + slides up with the same `sep`
              progress. Non-interactive until revealed so the separation scroll
              isn't captured; scrollable once shown (matters on tall/mobile). */}
          <div
            className="absolute inset-0 overflow-y-auto transition-opacity"
            style={{
              opacity: reveal,
              transform: `translateY(${(1 - reveal) * 24}px)`,
              pointerEvents: reveal > 0.99 ? "auto" : "none",
            }}
          >
            <AboutContent showHands={false} />
          </div>
        </div>
      </section>
    </div>
  );
}
