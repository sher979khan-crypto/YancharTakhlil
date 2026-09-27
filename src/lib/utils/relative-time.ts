/** How long ago something happened, in the unit the UI shows. No Intl: the result is plain data. */
export type RelativeTime =
  { unit: "justNow" } | { unit: "seconds" | "minutes" | "hours"; n: number };

/** Below this, the label says "just now" instead of counting seconds. */
export const JUST_NOW_SECONDS = 10;

/**
 * Buckets the time between `fromMs` and `nowMs`, rounded down: 0-9 s "just now", then seconds,
 * minutes and hours. A time in the future (clock skew between server and browser) is "just now".
 */
export function getRelativeTime(fromMs: number, nowMs: number): RelativeTime {
  const seconds = Math.floor((nowMs - fromMs) / 1000);
  if (!Number.isFinite(seconds) || seconds < JUST_NOW_SECONDS) return { unit: "justNow" };
  if (seconds < 60) return { unit: "seconds", n: seconds };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { unit: "minutes", n: minutes };
  return { unit: "hours", n: Math.floor(minutes / 60) };
}
