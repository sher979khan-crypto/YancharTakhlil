"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";

import { LocaleSwitcher } from "@/components/features/locale-switcher/locale-switcher";
import { Button } from "@/components/ui/button";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { usePathname } from "@/lib/i18n/navigation";
import { navItems } from "@/lib/navigation/nav-items";

import { NavLink } from "./nav-link";

/** Disclosure (not a modal): no focus trap, the panel follows the button in the tab order. */
export function MobileMenu() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // The menu remembers the route it was opened on, so any navigation closes it without
  // an effect that mirrors the pathname into state.
  const route = `${locale}:${pathname}`;
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === route;

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // A link to the current page does not change the route, so close on any link click too.
  function handlePanelClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) setOpenOn(null);
  }

  return (
    <div className="md:hidden">
      <Button
        ref={buttonRef}
        variant="ghost"
        className="size-10 px-0 text-lg"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenOn(open ? null : route)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
        <span className="sr-only">{open ? t("closeMenu") : t("openMenu")}</span>
      </Button>
      <div
        id={panelId}
        hidden={!open}
        onClick={handlePanelClick}
        className="absolute inset-x-0 top-full border-b border-line bg-surface-1 px-4 py-4 shadow-lg"
      >
        <nav aria-label={t("label")}>
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.key}>
                <NavLink href={item.href} className="w-full text-base">
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-4 border-t border-line pt-4">
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  );
}
