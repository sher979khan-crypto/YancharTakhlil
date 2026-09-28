"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** duration-slow (globals.css): how long the collapse runs before the content unmounts. */
const COLLAPSE_MS = 400;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * True while `open`, and for the collapse animation after it turns false, so the content can
 * animate out before it unmounts. Under reduced motion it unmounts at once.
 */
export function usePresence(open: boolean): boolean {
  const [present, setPresent] = useState(open);
  // Adjusting state while rendering (React's documented pattern): opening mounts at once.
  if (open && !present) setPresent(true);

  useEffect(() => {
    if (open || !present) return;
    const timer = setTimeout(() => setPresent(false), prefersReducedMotion() ? 0 : COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [open, present]);

  return present;
}

type ExpandProps = {
  open: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Height transition from 0 to the content's height (grid rows 0fr -> 1fr). Opening animates from
 * @starting-style, so it needs no extra render; closing is inert, so the collapsing content is
 * out of the tab order and the accessibility tree. No motion under prefers-reduced-motion.
 * Mount it only while usePresence(open) is true.
 */
export function Expand({ open, id, className, children }: ExpandProps) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-slow ease-snap motion-reduce:transition-none",
        open ? "grid-rows-[1fr] starting:grid-rows-[0fr]" : "grid-rows-[0fr]",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
