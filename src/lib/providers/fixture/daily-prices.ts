import * as z from "zod";

import {
  SPARKLINE_POINTS,
  type ChartRange,
  type Coin,
  type CoinDetail,
  type DailyPrice,
} from "@/lib/domain/market";

const DAY_MS = 86_400_000;
/** Daily moves are capped at this many standard deviations so a sample chart never looks broken. */
const MAX_SIGMAS = 4;
/** Spread of the daily volume around the current 24h volume (log scale). */
const VOLUME_SIGMA = 0.35;

type SeriesCoin = Pick<Coin, "id" | "priceUsd" | "marketCapUsd" | "volume24hUsd"> &
  Partial<Pick<CoinDetail, "change7dPct" | "change30dPct">>;

/** Days before today of the first point of the 7- and 30-day charts. */
const SEVEN_DAY_START = 6;
const THIRTY_DAY_START = 29;

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

/** Log-price offset that moves `close` to where a `changePct` move says it started. */
function anchorOffset(close: number, priceUsd: number, changePct: number | null | undefined) {
  if (changePct === null || changePct === undefined || changePct <= -100 || close <= 0) {
    return null;
  }
  return Math.log(priceUsd / (1 + changePct / 100)) - Math.log(close);
}

/**
 * Log-price tilt for each day (index = days ago): 0 today, linear in between the anchors, and
 * flat before the oldest one. It depends only on the raw walk, never on the range, so shorter
 * ranges stay the exact tail of longer ones.
 */
function tiltByDaysAgo(rawCloses: readonly number[], coin: SeriesCoin): number[] {
  const anchors: [daysAgo: number, offset: number][] = [[0, 0]];
  for (const [daysAgo, change] of [
    [SEVEN_DAY_START, coin.change7dPct],
    [THIRTY_DAY_START, coin.change30dPct],
  ] as const) {
    const offset = anchorOffset(rawCloses[daysAgo] ?? 0, coin.priceUsd, change);
    if (offset !== null) anchors.push([daysAgo, offset]);
  }
  return rawCloses.map((_, daysAgo) => {
    const next = anchors.findIndex(([anchorDay]) => anchorDay >= daysAgo);
    const last = anchors[anchors.length - 1] ?? [0, 0];
    if (next === -1) return last[1];
    const [toDay, toOffset] = anchors[next] ?? last;
    const [fromDay, fromOffset] = anchors[next - 1] ?? [toDay, toOffset];
    if (toDay === fromDay) return toOffset;
    return fromOffset + ((toOffset - fromOffset) * (daysAgo - fromDay)) / (toDay - fromDay);
  });
}

/**
 * Sample daily closes that end exactly at the coin's current price on `seedDate` ("YYYY-MM-DD").
 * Deterministic: the seed is the coin id plus the date. The walk runs backwards from today, so a
 * shorter range is always the tail of a longer one and the 7/30/90-day charts agree.
 *
 * The random walk alone ignores the snapshot's percentages, so it is tilted in log space: the
 * 7-day chart starts at price / (1 + change7d) and the 30-day chart at price / (1 + change30d)
 * (each only when known), with a linear blend in between and a constant shift before day 29.
 * Both anchors and the tail property hold exactly, because the tilt is a function of the day.
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
  // At least 30 days, so the 30-day anchor exists for the 7-day range too.
  const days = Math.max(range, THIRTY_DAY_START + 1);

  const rawCloses: number[] = [];
  const volumes: number[] = [];
  let close = coin.priceUsd;
  let volume = coin.volume24hUsd;
  for (let daysAgo = 0; daysAgo < days; daysAgo++) {
    rawCloses.push(close);
    volumes.push(volume);
    // Same number of draws per day, so the sequence does not depend on the range.
    const move = Math.max(-MAX_SIGMAS, Math.min(MAX_SIGMAS, normal(random))) * sigma;
    const volumeNoise = Math.max(-MAX_SIGMAS, Math.min(MAX_SIGMAS, normal(random)));
    // Log returns keep every price positive.
    close /= Math.exp(move);
    volume = coin.volume24hUsd * Math.exp(volumeNoise * VOLUME_SIGMA);
  }

  const tilt = tiltByDaysAgo(rawCloses, coin);
  const points: DailyPrice[] = [];
  for (let daysAgo = 0; daysAgo < range; daysAgo++) {
    points.push({
      date: new Date(endMs - daysAgo * DAY_MS).toISOString().slice(0, 10),
      // The tilt is 0 today, so the last close stays exactly the current price.
      closeUsd: roundSignificant((rawCloses[daysAgo] ?? 0) * Math.exp(tilt[daysAgo] ?? 0)),
      volumeUsd: Math.round(volumes[daysAgo] ?? 0),
    });
  }
  return points.reverse();
}

const SPARKLINE_DAYS = 7;
const POINTS_PER_DAY = SPARKLINE_POINTS / SPARKLINE_DAYS;

/**
 * Log-price correction that makes a series from generateDailyPrices start where the coin's 7-day
 * change says it did (price / (1 + change7d)). Zero without a usable change.
 */
function sevenDayTilt(firstClose: number, coin: SparklineCoin): number {
  const change = coin.change7dPct;
  if (change === null || change <= -100 || firstClose <= 0) return 0;
  return Math.log(coin.priceUsd / (1 + change / 100)) - Math.log(firstClose);
}

type SparklineCoin = SeriesCoin & Pick<Coin, "change7dPct">;

/**
 * A sample 7-day sparkline (SPARKLINE_POINTS points, one per 4 hours) that ends at the current
 * price. Its shape is the seeded 7-day daily series with a seeded Brownian bridge between two
 * closes. That series ignores the snapshot's 7d change, so a linear tilt (in log space, fading
 * to zero at "now") makes the line agree with the 7d percentage shown next to it; without a 7d
 * change, every sixth point is exactly a daily close.
 */
export function generateSparkline(coin: SparklineCoin, seedDate: string): number[] {
  // 30 days is the shortest range with the close from 7 days ago (the sparkline's start).
  const closes = generateDailyPrices(coin, 30, seedDate)
    .slice(-(SPARKLINE_DAYS + 1))
    .map((point) => point.closeUsd);
  const random = createRandom(hashString(`${coin.id}|${seedDate}|sparkline`));
  const stepSigma = dailyVolatility(coin.marketCapUsd) / Math.sqrt(POINTS_PER_DAY);
  const tilt = sevenDayTilt(closes[0] ?? coin.priceUsd, coin);

  const points: number[] = [];
  for (let day = 0; day < SPARKLINE_DAYS; day++) {
    const from = Math.log(closes[day] ?? coin.priceUsd);
    const to = Math.log(closes[day + 1] ?? coin.priceUsd);
    const walk = [0];
    for (let step = 1; step <= POINTS_PER_DAY; step++) {
      const move = Math.max(-MAX_SIGMAS, Math.min(MAX_SIGMAS, normal(random))) * stepSigma;
      walk.push((walk[step - 1] ?? 0) + move);
    }
    const end = walk[POINTS_PER_DAY] ?? 0;
    for (let step = 1; step <= POINTS_PER_DAY; step++) {
      const t = step / POINTS_PER_DAY;
      // The bridge term is zero at t = 1, so each day ends exactly on its (tilted) close.
      const bridge = (walk[step] ?? 0) - t * end;
      const elapsed = (points.length + 1) / SPARKLINE_POINTS;
      points.push(
        roundSignificant(Math.exp(from + (to - from) * t + bridge + tilt * (1 - elapsed))),
      );
    }
  }
  // Exact current price, not a rounded copy of it.
  points[points.length - 1] = coin.priceUsd;
  return points;
}
