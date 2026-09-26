import { IBM_Plex_Sans_Arabic, JetBrains_Mono, Noto_Sans, Unbounded } from "next/font/google";

// next/font only exposes CSS variables here; globals.css maps them to the Tailwind roles
// font-display / font-sans / font-mono. Only the weights the design uses are requested.

export const unbounded = Unbounded({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-unbounded-face",
});

// Latin body font. Chosen over IBM Plex Sans, which draws ʻ/ʼ (U+02BB/U+02BC) wider than "o".
export const notoSans = Noto_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-face",
});

export const plexSansArabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600"],
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-plex-arabic-face",
});

export const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono-face",
});

export const fontVariables = [unbounded, notoSans, plexSansArabic, jetBrainsMono]
  .map((font) => font.variable)
  .join(" ");
