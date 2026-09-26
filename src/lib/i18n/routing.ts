import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  // Owner decision: the first visit is always /en. next-intl gates both the Accept-Language
  // header and the locale cookie behind this one flag, so the cookie cannot be read without
  // also enabling header detection.
  localeDetection: false,
  // Nothing would ever read the cookie with detection off, so don't write it either.
  localeCookie: false,
});
