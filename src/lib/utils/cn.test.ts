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

  it("merges logical spacing utilities", () => {
    expect(cn("ms-2", "ms-4")).toBe("ms-4");
    expect(cn("ps-2 pe-2", "px-3")).toBe("px-3");
  });
});
