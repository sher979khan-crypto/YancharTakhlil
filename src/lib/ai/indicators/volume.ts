import { assertPeriod, percentFrom } from "./series";

export const RECENT_VOLUME_DAYS = 7;
export const BASELINE_VOLUME_DAYS = 23;

/** 24h volume as a percentage of market cap (turnover). Null without a positive market cap. */
export function volumeToMarketCapPct(volumeUsd: number, marketCapUsd: number): number | null {
  if (!Number.isFinite(volumeUsd) || volumeUsd < 0) return null;
  if (!Number.isFinite(marketCapUsd) || !(marketCapUsd > 0)) return null;
  return (volumeUsd / marketCapUsd) * 100;
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Average daily volume of the last `recentDays` vs. the `baselineDays` before them, in percent
 * (50 means the recent week trades 50% more). Needs recentDays + baselineDays volumes (oldest
 * first); null with fewer, with a missing or invalid volume in the window, or a zero baseline.
 */
export function volumeTrendPct(
  volumes: readonly (number | null)[],
  recentDays = RECENT_VOLUME_DAYS,
  baselineDays = BASELINE_VOLUME_DAYS,
): number | null {
  assertPeriod(recentDays, "recentDays");
  assertPeriod(baselineDays, "baselineDays");
  const needed = recentDays + baselineDays;
  if (volumes.length < needed) return null;

  const window: number[] = [];
  for (const volume of volumes.slice(-needed)) {
    // A gap would make the two averages cover different day counts.
    if (volume === null || !Number.isFinite(volume) || volume < 0) return null;
    window.push(volume);
  }
  const baseline = average(window.slice(0, baselineDays));
  const recent = average(window.slice(baselineDays));
  return percentFrom(recent, baseline);
}
