"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AboutContent } from "./about-content";
import { CREAM, INK } from "./constants";

type AboutInterstitialProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Full-screen About modal used by the LEGACY V1 home (Y-letter click). The new
 * scroll-driven DAY page renders the same `AboutContent` as an in-flow section
 * instead of a modal — see `DayScrollExperience`.
 */
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

      <AboutContent />
    </div>
  );
}
