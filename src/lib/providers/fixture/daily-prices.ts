import * as z from "zod";

import type { ChartRange, Coin, DailyPrice } from "@/lib/domain/market";

const DAY_MS = 86_400_000;
/** Daily moves are capped at this many standard deviations so a sample chart never looks broken. */
const MAX_SIGMAS = 4;
/** Spread of the daily volume around the current 24h volume (log scale). */
const VOLUME_SIGMA = 0.35;

type SeriesCoin = Pick<Coin, "id" | "priceUsd" | "marketCapUsd" | "volume24hUsd">;

/** FNV-1a, 32 bit: turns the seed string into a PRNG seed. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, seeded PRNG with uniform output in [0, 1). */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Standard normal sample (Box-Muller). 1 - u keeps the log argument in (0, 1]. */
function normal(random: () => number): number {
  const u1 = 1 - random();
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Daily volatility (standard deviation of log returns) by market cap: 2% at $1T and above,
 * one more point per decade below, capped at 8%. Small caps swing more, like real markets.
 */
export function dailyVolatility(marketCapUsd: number): number {
  const decadesBelowTrillion = 12 - Math.log10(Math.max(marketCapUsd, 1));
  return Math.min(0.08, Math.max(0.02, 0.02 + 0.01 * decadesBelowTrillion));
}

function roundSignificant(value: number): number {
  return Number(value.toPrecision(8));
}

/**
 * Sample daily closes that end exactly at the coin's current price on `seedDate` ("YYYY-MM-DD").
 * Deterministic: the seed is the coin id plus the date. The walk runs backwards from today, so a
 * shorter range is always the tail of a longer one and the 7/30/90-day charts agree.
 */
export function generateDailyPrices(
  coin: SeriesCoin,
  range: ChartRange,
  seedDate: string,
): DailyPrice[] {
  if (!z.iso.date().safeParse(seedDate).success) {
    throw new RangeError(`seedDate must be YYYY-MM-DD, got "${seedDate}"`);
  }
  const random = createRandom(hashString(`${coin.id}|${seedDate}`));
  const sigma = dailyVolatility(coin.marketCapUsd);
  const endMs = Date.parse(`${seedDate}T00:00:00Z`);

  const points: DailyPrice[] = [];
  let close = coin.priceUsd;
  let volume = coin.volume24hUsd;
  for (let daysAgo = 0; daysAgo < range; daysAgo++) {
    points.push({
      date: new Date(endMs - daysAgo * DAY_MS).toISOString().slice(0, 10),
      closeUsd: roundSignificant(close),
      volumeUsd: Math.round(volume),
    });
    // Same number of draws per day, so the sequence does not depend on the range.
    const move = Math.max(-MAX_SIGMAS, Math.min(MAX_SIGMAS, normal(random))) * sigma;
    const volumeNoise = Math.max(-MAX_SIGMAS, Math.min(MAX_SIGMAS, normal(random)));
    // Log returns keep every price positive.
    close /= Math.exp(move);
    volume = coin.volume24hUsd * Math.exp(volumeNoise * VOLUME_SIGMA);
  }
  return points.reverse();
}
