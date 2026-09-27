import { describe, expect, it } from "vitest";

import { clientIpFromHeaders, createAiGuards, UNKNOWN_CLIENT } from "./guards";

const LIMITS = { perIpPerMinute: 3, perIpPerDay: 20, globalPerDay: 45 };
// 2026-09-27T12:00:00Z
const NOON = Date.UTC(2026, 8, 27, 12);

function clock(start = NOON) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("createAiGuards: per-IP limits", () => {
  it("allows 3 analyses per minute per IP, then refuses with the wait until a slot frees", () => {
    const time = clock();
    const guards = createAiGuards({ ...LIMITS, now: time.now });
    expect(guards.tryAcquireAnalysis("1.1.1.1")).toEqual({ ok: true });
    time.advance(10_000);
    expect(guards.tryAcquireAnalysis("1.1.1.1")).toEqual({ ok: true });
    expect(guards.tryAcquireAnalysis("1.1.1.1")).toEqual({ ok: true });
    expect(guards.tryAcquireAnalysis("1.1.1.1")).toEqual({
      ok: false,
      reason: "ip_minute",
      retryAfterSeconds: 50,
    });
    // Other clients are unaffected.
    expect(guards.tryAcquireAnalysis("2.2.2.2")).toEqual({ ok: true });
    // The first call leaves the window after 60 s.
    time.advance(50_000);
    expect(guards.tryAcquireAnalysis("1.1.1.1")).toEqual({ ok: true });
  });

  it("allows 20 per UTC day per IP and resets at midnight UTC", () => {
    const time = clock(Date.UTC(2026, 8, 27, 23, 0));
    const guards = createAiGuards({ ...LIMITS, now: time.now });
    for (let i = 0; i < 20; i += 1) {
      expect(guards.tryAcquireAnalysis("1.1.1.1").ok).toBe(true);
      time.advance(61_000);
    }
    time.advance(-61_000);
    const refused = guards.tryAcquireAnalysis("1.1.1.1");
    expect(refused).toMatchObject({ ok: false, reason: "ip_day" });
    // 23:00 + 19 min 19 s -> 40 min 41 s to midnight.
    expect(refused.ok === false && Math.round(refused.retryAfterSeconds)).toBe(2441);
    time.advance(2441_000);
    expect(guards.tryAcquireAnalysis("1.1.1.1")).toEqual({ ok: true });
  });

  it("does not count refused requests", () => {
    const time = clock();
    const guards = createAiGuards({ ...LIMITS, perIpPerDay: 4, now: time.now });
    for (let i = 0; i < 3; i += 1) guards.tryAcquireAnalysis("1.1.1.1");
    for (let i = 0; i < 5; i += 1) expect(guards.tryAcquireAnalysis("1.1.1.1").ok).toBe(false);
    time.advance(60_000);
    expect(guards.tryAcquireAnalysis("1.1.1.1").ok).toBe(true);
  });

  it("forgets the least recently seen IP beyond maxTrackedIps", () => {
    const time = clock();
    const guards = createAiGuards({
      ...LIMITS,
      perIpPerMinute: 1,
      maxTrackedIps: 2,
      now: time.now,
    });
    guards.tryAcquireAnalysis("1.1.1.1");
    guards.tryAcquireAnalysis("2.2.2.2");
    guards.tryAcquireAnalysis("3.3.3.3");
    // 1.1.1.1 was evicted, so its minute counter starts over.
    expect(guards.tryAcquireAnalysis("1.1.1.1").ok).toBe(true);
    expect(guards.tryAcquireAnalysis("3.3.3.3").ok).toBe(false);
  });
});

describe("createAiGuards: global LLM budget", () => {
  it("allows 45 LLM calls per UTC day and resets the next day", () => {
    const time = clock();
    const guards = createAiGuards({ ...LIMITS, now: time.now });
    for (let i = 0; i < 45; i += 1) expect(guards.tryAcquireLlmCall()).toBe(true);
    expect(guards.tryAcquireLlmCall()).toBe(false);
    time.advance(12 * 3_600_000);
    expect(guards.tryAcquireLlmCall()).toBe(true);
  });

  it("is independent of the per-IP counters", () => {
    const guards = createAiGuards({ ...LIMITS, globalPerDay: 1, now: () => NOON });
    expect(guards.tryAcquireLlmCall()).toBe(true);
    expect(guards.tryAcquireAnalysis("1.1.1.1").ok).toBe(true);
    expect(guards.tryAcquireLlmCall()).toBe(false);
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers Netlify's x-nf-client-connection-ip", () => {
    const headers = new Headers({
      "x-nf-client-connection-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for entry", () => {
    expect(
      clientIpFromHeaders(new Headers({ "x-forwarded-for": " 198.51.100.1 , 10.0.0.1" })),
    ).toBe("198.51.100.1");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "2001:DB8::1" }))).toBe(
      "2001:db8::1",
    );
  });

  it("uses the shared unknown key when no usable IP is present", () => {
    expect(clientIpFromHeaders(new Headers())).toBe(UNKNOWN_CLIENT);
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "<script>" }))).toBe(
      UNKNOWN_CLIENT,
    );
    expect(clientIpFromHeaders(new Headers({ "x-nf-client-connection-ip": "not an ip" }))).toBe(
      UNKNOWN_CLIENT,
    );
  });
});
