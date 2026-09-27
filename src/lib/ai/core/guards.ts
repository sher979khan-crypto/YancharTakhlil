import "server-only";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** The key for requests without a usable client IP; they share one bucket. */
export const UNKNOWN_CLIENT = "unknown";

export type GuardLimits = {
  perIpPerMinute: number;
  perIpPerDay: number;
  /** LLM calls per UTC day across all clients. */
  globalPerDay: number;
};

export type GuardDecision =
  { ok: true } | { ok: false; reason: "ip_minute" | "ip_day"; retryAfterSeconds: number };

export type AiGuards = {
  /** Counts one uncached analysis for `ip` if it is within the per-IP limits. */
  tryAcquireAnalysis(ip: string): GuardDecision;
  /** Counts one LLM call if the global daily budget allows it. */
  tryAcquireLlmCall(): boolean;
};

type GuardOptions = GuardLimits & {
  now?: () => number;
  /** Bound on tracked IPs; the least recently seen goes first. */
  maxTrackedIps?: number;
};

type IpState = { recent: number[]; day: number; dayCount: number };

/** Days since the epoch in UTC: the daily counters reset at 00:00 UTC. */
function utcDay(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/**
 * In-memory usage limits for the AI agents. Best-effort, like the CoinGecko stale cache: every
 * server process (each Netlify function instance) keeps its own counters, which start empty on a
 * cold start. They stop a single client or a burst from spending the free OpenRouter quota; they
 * are not a hard global limit across instances. Cache hits never reach them.
 */
export function createAiGuards({
  perIpPerMinute,
  perIpPerDay,
  globalPerDay,
  now = Date.now,
  maxTrackedIps = 10_000,
}: GuardOptions): AiGuards {
  const ips = new Map<string, IpState>();
  let global = { day: utcDay(now()), count: 0 };

  function stateFor(ip: string, at: number): IpState {
    const day = utcDay(at);
    const existing = ips.get(ip);
    // Re-inserting moves the IP to the end, so the first key is always the least recently seen.
    ips.delete(ip);
    const state: IpState =
      existing && existing.day === day ? existing : { recent: [], day, dayCount: 0 };
    state.recent = state.recent.filter((time) => at - time < MINUTE_MS);
    ips.set(ip, state);
    if (ips.size > maxTrackedIps) {
      const oldest = ips.keys().next();
      if (!oldest.done) ips.delete(oldest.value);
    }
    return state;
  }

  return {
    tryAcquireAnalysis(ip) {
      const at = now();
      const state = stateFor(ip, at);
      if (state.dayCount >= perIpPerDay) {
        return {
          ok: false,
          reason: "ip_day",
          retryAfterSeconds: ((state.day + 1) * DAY_MS - at) / 1000,
        };
      }
      const oldest = state.recent[0];
      if (state.recent.length >= perIpPerMinute && oldest !== undefined) {
        return {
          ok: false,
          reason: "ip_minute",
          retryAfterSeconds: (oldest + MINUTE_MS - at) / 1000,
        };
      }
      state.recent.push(at);
      state.dayCount += 1;
      return { ok: true };
    },

    tryAcquireLlmCall() {
      const day = utcDay(now());
      if (global.day !== day) global = { day, count: 0 };
      if (global.count >= globalPerDay) return false;
      global.count += 1;
      return true;
    },
  };
}

// IPv4 or IPv6 characters only, so a forged header cannot smuggle anything into a map key.
const IP_PATTERN = /^[0-9a-f.:]{2,45}$/i;

function cleanIp(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  return candidate && IP_PATTERN.test(candidate) ? candidate.toLowerCase() : null;
}

/**
 * The client IP for the per-IP limits. Netlify sets x-nf-client-connection-ip to the connecting
 * client (Netlify support forum; the official docs do not list it), so it is read first; then the
 * first x-forwarded-for entry (other proxies, local `next start`). Without either, all requests
 * share UNKNOWN_CLIENT. The IP is only ever a map key: never logged or stored beyond the counters.
 */
export function clientIpFromHeaders(headers: Headers): string {
  return (
    cleanIp(headers.get("x-nf-client-connection-ip")) ??
    cleanIp(headers.get("x-forwarded-for")?.split(",")[0]) ??
    UNKNOWN_CLIENT
  );
}
