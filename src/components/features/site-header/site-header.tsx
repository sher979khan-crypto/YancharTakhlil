import { useTranslations } from "next-intl";

import { Logo } from "@/components/features/brand/logo";
import { LocaleSwitcher } from "@/components/features/locale-switcher/locale-switcher";
import { Link } from "@/lib/i18n/navigation";
import { navItems } from "@/lib/navigation/nav-items";

import { FloatingHeader } from "./floating-header";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

export function SiteHeader() {
  const t = useTranslations("Nav");

  return (
    <FloatingHeader>
      {/* flex-wrap: the mobile menu panel (basis-full) wraps below the bar inside the same pill,
          so an open menu adds no extra backdrop-filter layer. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 px-3 sm:px-5">
        <Link href="/" className="inline-flex min-h-10 items-center rounded-md px-1 py-3">
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
    </FloatingHeader>
  );
}
