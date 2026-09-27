import type { HTMLAttributes } from "react";

import { glassPanelClassName, type GlassStrength } from "./glass";

export type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  /** "strong" is more opaque: use it for text-heavy glass. */
  strength?: GlassStrength;
  as?: "div" | "section" | "aside" | "article";
};

/** Blurred glass for navigation, hero, panels and overlays. Data tables stay on solid Cards. */
export function GlassPanel({
  strength = "default",
  as: Tag = "div",
  className,
  ...props
}: GlassPanelProps) {
  return <Tag className={glassPanelClassName({ strength, className })} {...props} />;
}
