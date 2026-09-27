import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins classes and drops falsy values", () => {
    const hidden = false;
    expect(cn("a", hidden && "b", null, undefined, "c")).toBe("a c");
    expect(cn(["a", { b: true, c: false }])).toBe("a b");
  });

  it("lets later classes win on conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("bg-surface-1", "bg-surface-2")).toBe("bg-surface-2");
    expect(cn("text-fg-muted", "text-up")).toBe("text-up");
  });

  it("keeps a color and a size on the same text- prefix", () => {
    expect(cn("text-sm text-fg", "text-up")).toBe("text-sm text-up");
  });

  it("knows the custom theme keys", () => {
    expect(cn("shadow-glow-up", "shadow-glow-down")).toBe("shadow-glow-down");
    expect(cn("duration-fast", "duration-slow")).toBe("duration-slow");
    expect(cn("ease-snap", "ease-linear")).toBe("ease-linear");
    expect(cn("animate-shimmer", "animate-none")).toBe("animate-none");
  });

  it("knows the Glass & Crystal theme keys", () => {
    expect(cn("shadow-glass", "shadow-glass-lifted")).toBe("shadow-glass-lifted");
    expect(cn("shadow-glass", "shadow-glow-ice")).toBe("shadow-glow-ice");
    expect(cn("shadow-glass", "shadow-none")).toBe("shadow-none");
    expect(cn("backdrop-blur-glass-sm", "backdrop-blur-none")).toBe("backdrop-blur-none");
    expect(cn("sm:backdrop-blur-glass", "sm:backdrop-blur-glass-sm")).toBe(
      "sm:backdrop-blur-glass-sm",
    );
    expect(cn("inset-shadow-highlight", "inset-shadow-none")).toBe("inset-shadow-none");
    // Outer and inset shadows are separate layers, so both survive.
    expect(cn("inset-shadow-highlight", "shadow-glow-brand")).toBe(
      "inset-shadow-highlight shadow-glow-brand",
    );
    expect(cn("text-shadow-glow-ice", "text-shadow-none")).toBe("text-shadow-none");
    expect(cn("drop-shadow-glow-ice", "drop-shadow-none")).toBe("drop-shadow-none");
    expect(cn("animate-float", "animate-none")).toBe("animate-none");
    expect(cn("rounded-lg", "rounded-2xl")).toBe("rounded-2xl");
  });

  it("keeps glass color, border and sheen classes apart", () => {
    expect(cn("bg-glass-fill", "bg-glass-fill-strong")).toBe("bg-glass-fill-strong");
    expect(cn("bg-surface-1", "bg-glass-fill")).toBe("bg-glass-fill");
    // Fill color and sheen image are different properties, so both survive.
    expect(cn("bg-glass-fill bg-linear-to-b", "bg-surface-2")).toBe("bg-linear-to-b bg-surface-2");
    expect(cn("border-glass-border", "border-glass-border-strong")).toBe(
      "border-glass-border-strong",
    );
    // The fallback variant is its own modifier, so it never cancels the glass classes.
    expect(cn("bg-glass-fill", "glass-fallback:bg-surface-1")).toBe(
      "bg-glass-fill glass-fallback:bg-surface-1",
    );
  });

  it("merges logical spacing utilities", () => {
    expect(cn("ms-2", "ms-4")).toBe("ms-4");
    expect(cn("ps-2 pe-2", "px-3")).toBe("px-3");
  });
});
