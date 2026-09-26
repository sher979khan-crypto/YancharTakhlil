function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/**
 * Whether a nav item should be marked current for a locale-free pathname. Home only matches
 * itself; every other item also matches its sub-pages (e.g. /markets/page/2).
 */
export function isActive(pathname: string, href: string): boolean {
  const current = stripTrailingSlash(pathname);
  const target = stripTrailingSlash(href);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}
