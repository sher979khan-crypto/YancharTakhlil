"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { glassPanelClassName } from "@/components/ui/glass";
import { cn } from "@/lib/utils/cn";

/**
 * Sticky glass pill. A 1px sentinel at the top of the document tells an IntersectionObserver
 * when the page has scrolled (no scroll listeners); the pill then lifts with a deeper shadow.
 * Children stay Server Components.
 */
export function FloatingHeader({ children }: { children: ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setScrolled(!entry.isIntersecting);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Absolute to the initial containing block: it sits at the very top of the page. */}
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
      />
      {/* The side gutters must not swallow clicks meant for content scrolling underneath. */}
      <header className="pointer-events-none sticky top-4 z-40 mt-4 px-4">
        <div
          data-scrolled={scrolled || undefined}
          className={cn(
            glassPanelClassName({ strength: "strong" }),
            "pointer-events-auto mx-auto max-w-6xl transition-shadow duration-base ease-snap",
            scrolled && "shadow-glass-lifted",
          )}
        >
          {children}
        </div>
      </header>
    </>
  );
}
