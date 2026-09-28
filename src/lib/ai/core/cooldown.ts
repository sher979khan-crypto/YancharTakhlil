import "server-only";

/** Why a model is skipped for a while: its provider rate limited us, or it did not answer in time. */
export type CooldownReason = "rate_limited" | "timeout";

export type CooldownLimits = {
  /** Skip a model this long after a 429. */
  rateLimitedMs: number;
  /** Skip a model this long after a timeout. */
  timeoutMs: number;
};

export type ModelCooldown = {
  /** True while `modelId` is still cooling down from its last failure. */
  isCoolingDown(modelId: string): boolean;
  /** Starts (or restarts) the cool-down for `modelId`. */
  record(modelId: string, reason: CooldownReason): void;
};

type CooldownOptions = CooldownLimits & {
  /** Monotonic milliseconds. */
  now?: () => number;
};

/**
 * A per-model circuit breaker: a free model that just returned 429 is almost always still limited
 * a few seconds later, and one that just timed out is often overloaded. Skipping it for a short
 * while leaves the request's time budget to the next model instead of spending it on a repeat
 * failure. In memory and best-effort per server instance, like the guards; a cold start forgets it.
 */
export function createModelCooldown({
  rateLimitedMs,
  timeoutMs,
  now = () => performance.now(),
}: CooldownOptions): ModelCooldown {
  const until = new Map<string, number>();

  return {
    isCoolingDown(modelId) {
      const end = until.get(modelId);
      if (end === undefined) return false;
      if (now() < end) return true;
      until.delete(modelId);
      return false;
    },
    record(modelId, reason) {
      const duration = reason === "rate_limited" ? rateLimitedMs : timeoutMs;
      until.set(modelId, now() + duration);
    },
  };
}
