import { describe, expect, it } from "vitest";

import { createModelCooldown } from "./cooldown";

function setup() {
  let time = 1_000;
  const cooldown = createModelCooldown({
    rateLimitedMs: 60_000,
    timeoutMs: 30_000,
    now: () => time,
  });
  return {
    cooldown,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("createModelCooldown", () => {
  it("never skips a model that has not failed", () => {
    const { cooldown } = setup();
    expect(cooldown.isCoolingDown("m/one:free")).toBe(false);
  });

  it("skips a model for 60 s after a rate limit", () => {
    const { cooldown, advance } = setup();
    cooldown.record("m/one:free", "rate_limited");
    advance(59_999);
    expect(cooldown.isCoolingDown("m/one:free")).toBe(true);
    advance(1);
    expect(cooldown.isCoolingDown("m/one:free")).toBe(false);
  });

  it("skips a model for 30 s after a timeout", () => {
    const { cooldown, advance } = setup();
    cooldown.record("m/one:free", "timeout");
    advance(29_999);
    expect(cooldown.isCoolingDown("m/one:free")).toBe(true);
    advance(1);
    expect(cooldown.isCoolingDown("m/one:free")).toBe(false);
  });

  it("tracks each model on its own", () => {
    const { cooldown } = setup();
    cooldown.record("m/one:free", "rate_limited");
    expect(cooldown.isCoolingDown("m/one:free")).toBe(true);
    expect(cooldown.isCoolingDown("m/two:free")).toBe(false);
  });

  it("restarts the cool-down on a new failure", () => {
    const { cooldown, advance } = setup();
    cooldown.record("m/one:free", "timeout");
    advance(20_000);
    cooldown.record("m/one:free", "rate_limited");
    advance(50_000);
    expect(cooldown.isCoolingDown("m/one:free")).toBe(true);
    advance(10_000);
    expect(cooldown.isCoolingDown("m/one:free")).toBe(false);
  });
});
