import { useTranslations } from "next-intl";

import { Logo } from "@/components/features/brand/logo";
import { LocaleSwitcher } from "@/components/features/locale-switcher/locale-switcher";
import { Link } from "@/lib/i18n/navigation";
import { navItems } from "@/lib/navigation/nav-items";

import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-1/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="-ms-1 inline-flex min-h-10 items-center rounded-md px-1">
          <Logo />
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          <nav aria-label={t("label")}>
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.key}>
                  <NavLink href={item.href}>{t(item.key)}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <LocaleSwitcher />
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}
