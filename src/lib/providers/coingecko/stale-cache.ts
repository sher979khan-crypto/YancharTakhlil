import "server-only";

import { isMarketDataError, type MarketDataErrorCode } from "@/lib/domain/errors";

/** Upstream trouble that last-good data can paper over. NOT_FOUND and CONFIG are real answers. */
const FALLBACK_CODES: ReadonlySet<MarketDataErrorCode> = new Set([
  "RATE_LIMITED",
  "UPSTREAM",
  "INVALID_RESPONSE",
]);

type Entry = { value: unknown; storedAt: number };

export type StaleCacheResult<T> = { value: T; stale: boolean };

export type StaleCache = {
  /**
   * Returns the stored value while it is younger than `ttlMs`; otherwise runs `load` (concurrent
   * callers of one key share a single load). If the load fails with an upstream error and a
   * last-good value exists, that value comes back with `stale: true`; otherwise the error is thrown.
   */
  load<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<StaleCacheResult<T>>;
};

type StaleCacheOptions = {
  now?: () => number;
  /** Bound on stored keys; the least recently written key goes first. */
  maxEntries?: number;
  log?: (line: string) => void;
};

/**
 * In-memory last-good store per endpoint key, local to one server process. It is best-effort:
 * each serverless instance (Netlify function) has its own copy that starts empty on a cold start
 * and disappears when the instance is recycled, so it softens upstream outages but guarantees
 * nothing. Values are shared between requests, so callers must not mutate what they get back.
 */
export function createStaleCache({
  now = Date.now,
  maxEntries = 512,
  log = (line) => console.warn(line),
}: StaleCacheOptions = {}): StaleCache {
  const entries = new Map<string, Entry>();
  const inFlight = new Map<string, Promise<unknown>>();

  function store(key: string, value: unknown) {
    // Re-inserting moves the key to the end, so the first key is always the oldest write.
    entries.delete(key);
    entries.set(key, { value, storedAt: now() });
    if (entries.size > maxEntries) {
      const oldest = entries.keys().next();
      if (!oldest.done) entries.delete(oldest.value);
    }
  }

  return {
    async load<T>(key: string, ttlMs: number, load: () => Promise<T>) {
      const entry = entries.get(key);
      if (entry && now() - entry.storedAt < ttlMs) {
        // Only this function writes the entry for a key, always with the loader's T.
        return { value: entry.value as T, stale: false };
      }

      let pending = inFlight.get(key) as Promise<T> | undefined;
      if (!pending) {
        pending = load().then((value) => {
          store(key, value);
          return value;
        });
        const cleanup = () => inFlight.delete(key);
        pending.then(cleanup, cleanup);
        inFlight.set(key, pending);
      }

      try {
        return { value: await pending, stale: false };
      } catch (error) {
        const lastGood = entries.get(key);
        if (lastGood && isMarketDataError(error) && FALLBACK_CODES.has(error.code)) {
          log(`[coingecko] ${key}: ${error.code}; serving last good data`);
          return { value: lastGood.value as T, stale: true };
        }
        throw error;
      }
    },
  };
}
