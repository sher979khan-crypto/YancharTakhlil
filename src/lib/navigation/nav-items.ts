export type NavItem = {
  /** Message key under the Nav namespace. */
  key: "home" | "markets";
  /** Locale-free pathname; next-intl's Link adds the locale prefix. */
  href: "/" | "/markets";
};

export const navItems: readonly NavItem[] = [
  { key: "home", href: "/" },
  { key: "markets", href: "/markets" },
];
