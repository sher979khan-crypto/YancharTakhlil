import "server-only";

type Entry = { value: unknown; storedAt: number };

export type TtlCache = {
  /** The stored value while it is younger than the TTL, else undefined. */
  get<T>(key: string): T | undefined;
  /**
   * The stored value if fresh; otherwise runs `load` and stores its result. Concurrent callers
   * of one key share a single load. A failed load stores nothing and every waiting caller gets
   * the error.
   */
  load<T>(key: string, load: () => Promise<T>): Promise<T>;
};

type TtlCacheOptions = {
  ttlMs: number;
  now?: () => number;
  /** Bound on stored keys; the least recently written key goes first. */
  maxEntries?: number;
};

/**
 * In-process TTL cache for AI results, with the in-flight sharing of the CoinGecko stale cache but
 * no stale serving: an expired analysis is never shown. Best-effort per server instance (a cold
 * Netlify function starts empty); the CDN s-maxage does the cross-instance caching. Values are
 * shared between requests, so callers must not mutate them.
 */
export function createTtlCache({
  ttlMs,
  now = Date.now,
  maxEntries = 512,
}: TtlCacheOptions): TtlCache {
  const entries = new Map<string, Entry>();
  const inFlight = new Map<string, Promise<unknown>>();

  function get<T>(key: string): T | undefined {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (now() - entry.storedAt >= ttlMs) {
      entries.delete(key);
      return undefined;
    }
    // Only load() writes an entry for a key, always with the loader's T.
    return entry.value as T;
  }

  function store(key: string, value: unknown) {
    entries.delete(key);
    entries.set(key, { value, storedAt: now() });
    if (entries.size > maxEntries) {
      const oldest = entries.keys().next();
      if (!oldest.done) entries.delete(oldest.value);
    }
  }

  return {
    get,
    async load<T>(key: string, load: () => Promise<T>): Promise<T> {
      const cached = get<T>(key);
      if (cached !== undefined) return cached;

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
      return pending;
    },
  };
}
