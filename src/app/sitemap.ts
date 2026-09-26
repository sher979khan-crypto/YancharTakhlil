import type { MetadataRoute } from "next";

import { locales } from "@/lib/i18n/config";
import { buildAlternates } from "@/lib/seo/alternates";

// Static public pages only; coin pages are added once they exist (never all coins at build).
const pathnames = ["/", "/markets", "/disclaimer"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return pathnames.flatMap((pathname) =>
    locales.map((locale) => {
      const { canonical, languages } = buildAlternates(locale, pathname);
      return { url: canonical, alternates: { languages } };
    }),
  );
}
