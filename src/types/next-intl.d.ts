import type { Locale as AppLocale } from "@/lib/i18n/config";

import type messages from "../messages/en.json";

// en.json is the reference: a key missing from it fails `pnpm typecheck`.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
