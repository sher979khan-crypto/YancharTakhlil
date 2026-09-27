import type { Locale } from "./config";

type Months = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export type DateFormatSpec = Readonly<{
  /** Short month names, January first. */
  months: Months;
  /** Day and month, e.g. "Sep 27". */
  dayMonth: (day: number, month: string) => string;
  /** Day, month and year, e.g. "Sep 27, 2026". */
  dayMonthYear: (day: number, month: string, year: number) => string;
}>;

// Our own month names and patterns, for the same reason as number-format-spec.ts: Intl date data
// differs between runtimes (and is missing for uz in Chromium), which would break hydration.
// Patterns follow CLDR's MMMd / yMMMd for each locale.
export const dateFormatSpec: Readonly<Record<Locale, DateFormatSpec>> = {
  en: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    dayMonth: (day, month) => `${month} ${day}`,
    dayMonthYear: (day, month, year) => `${month} ${day}, ${year}`,
  },
  ar: {
    // Arabic has no abbreviated month names: CLDR uses the full ones.
    months: [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ],
    dayMonth: (day, month) => `${day} ${month}`,
    dayMonthYear: (day, month, year) => `${day} ${month} ${year}`,
  },
  uz: {
    months: ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"],
    dayMonth: (day, month) => `${day}-${month}`,
    dayMonthYear: (day, month, year) => `${day}-${month}, ${year}`,
  },
};
