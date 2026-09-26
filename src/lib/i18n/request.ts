import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // `locale` is only set when a caller passes one explicitly (e.g. getTranslations({ locale })).
  let resolved = locale;
  if (!resolved) {
    const paramValue: unknown = await rootParams.locale();
    if (typeof paramValue === "string" && hasLocale(routing.locales, paramValue)) {
      resolved = paramValue;
    } else {
      notFound();
    }
  }

  return {
    locale: resolved,
    messages: (await import(`../../messages/${resolved}.json`)).default,
  };
});
