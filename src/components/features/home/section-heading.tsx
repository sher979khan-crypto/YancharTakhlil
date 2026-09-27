import type { ReactNode } from "react";

/** h2 for the live home sections, so they share one scale. */
export function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-display text-xl font-semibold text-fg sm:text-2xl">
      {children}
    </h2>
  );
}
