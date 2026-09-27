import { describe, expect, it } from "vitest";

import { getRelativeTime } from "./relative-time";

const NOW = Date.parse("2026-09-27T12:00:00Z");
const ago = (seconds: number) => getRelativeTime(NOW - seconds * 1000, NOW);

describe("getRelativeTime", () => {
  it("says just now for the first 10 seconds", () => {
    expect(ago(0)).toEqual({ unit: "justNow" });
    expect(ago(9.9)).toEqual({ unit: "justNow" });
  });

  it("counts seconds, then minutes, then hours, rounding down", () => {
    expect(ago(10)).toEqual({ unit: "seconds", n: 10 });
    expect(ago(59)).toEqual({ unit: "seconds", n: 59 });
    expect(ago(60)).toEqual({ unit: "minutes", n: 1 });
    expect(ago(119)).toEqual({ unit: "minutes", n: 1 });
    expect(ago(3599)).toEqual({ unit: "minutes", n: 59 });
    expect(ago(3600)).toEqual({ unit: "hours", n: 1 });
    expect(ago(50 * 3600)).toEqual({ unit: "hours", n: 50 });
  });

  it("treats a future time (clock skew) and invalid input as just now", () => {
    expect(ago(-120)).toEqual({ unit: "justNow" });
    expect(getRelativeTime(Number.NaN, NOW)).toEqual({ unit: "justNow" });
  });
});
